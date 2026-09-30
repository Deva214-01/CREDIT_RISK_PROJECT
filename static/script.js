const form = document.getElementById("riskForm");
const API_URL = `${window.location.origin}/predict`;
const assessBtn = document.getElementById("assessBtn");
const demoBtn = document.getElementById("demoBtn");
const resetBtn = document.getElementById("resetBtn");
const resultPanel = document.getElementById("resultPanel");
const resultState = document.getElementById("resultState");
const probability = document.getElementById("probability");
const probMetric = document.getElementById("probMetric");
const thresholdMetric = document.getElementById("thresholdMetric");
const verdictMetric = document.getElementById("verdictMetric");
const verdictText = document.getElementById("verdictText");
const verdictRing = document.getElementById("verdictRing");
const gauge = document.getElementById("gauge");
const riskFill = document.getElementById("riskFill");
const riskPercent = document.getElementById("riskPercent");
const gaugeVerdict = document.getElementById("gaugeVerdict");
const shieldIcon = document.getElementById("shieldIcon");
const thresholdPin = document.getElementById("thresholdPin");
const toast = document.getElementById("toast");

const fieldIds = [
  "person_age","person_income","person_home_ownership","person_emp_length",
  "loan_intent","loan_grade","loan_amnt","loan_int_rate",
  "loan_percent_income","cb_person_default_on_file","cb_person_cred_hist_length"
];

function val(id){
  const el = document.getElementById(id);
  return el.type === "number" ? Number(el.value) : el.value;
}

function payload(){
  const data = {};
  fieldIds.forEach(id => data[id] = val(id));
  return data;
}

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => toast.classList.remove("show"), 3200);
}

function setLoading(active){
  assessBtn.disabled = active;
  assessBtn.classList.toggle("loading", active);
}

function animateValue(el, target, decimals=1){
  const start = performance.now();
  const duration = 850;
  function frame(now){
    const p = Math.min((now-start)/duration,1);
    const eased = 1-Math.pow(1-p,3);
    el.textContent = (target*eased).toFixed(decimals);
    if(p<1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function updateResult(data){
  const p = Math.max(0, Math.min(1, Number(data.default_probability)));
  const threshold = Math.max(0, Math.min(1, Number(data.threshold)));
  const high = Number(data.default_prediction) === 1;
  const pPct = p * 100;
  const tPct = threshold * 100;

  resultPanel.classList.add("updated");
  resultPanel.classList.toggle("high-risk", high);
  resultPanel.classList.toggle("low-risk", !high);

  resultState.textContent = high ? "THRESHOLD EXCEEDED" : "WITHIN THRESHOLD";
  animateValue(probability, pPct, 1);

  probMetric.textContent = `${pPct.toFixed(1)}%`;
  thresholdMetric.textContent = `${tPct.toFixed(1)}%`;
  verdictMetric.textContent = data.Result || (high ? "High Risk" : "Low Risk");
  gaugeVerdict.textContent = high ? "HIGH RISK" : "LOW RISK";
  riskPercent.innerHTML = `${pPct.toFixed(1)}% <small>(lower is better)</small>`;

  shieldIcon.textContent = high ? "!" : "✓";

  const degree = Math.max(3, p * 360);
  const accent = high ? "#e46f78" : "#35e6a0";
  gauge.style.setProperty("--gauge-angle", `${degree}deg`);
  gauge.style.setProperty("--accent", accent);
  gauge.style.background =
    `conic-gradient(${accent} 0deg ${degree}deg, rgba(72,91,105,.25) ${degree}deg 360deg)`;

  riskFill.style.width = `${pPct}%`;
  thresholdPin.style.left = `calc(${tPct}% - 1px)`;

  resultPanel.scrollIntoView({behavior:"smooth", block:"center"});
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = payload();

  if(data.person_age < 18 || data.person_age > 100){
    showToast("Please enter a valid applicant age.");
    return;
  }
  if(data.person_income <= 0 || data.loan_amnt <= 0){
    showToast("Income and loan amount must be greater than zero.");
    return;
  }

  setLoading(true);

  try{
    const response = await fetch(API_URL,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Accept":"application/json"
      },
      body:JSON.stringify(data)
    });

    let result;
    try{
      result = await response.json();
    }catch{
      throw new Error(`Prediction API returned HTTP ${response.status}.`);
    }

    if(!response.ok){
      let message = "Prediction failed.";
      if(Array.isArray(result.detail)){
        message = result.detail.map(x => x.msg).join(" · ");
      }else if(result.detail){
        message = result.detail;
      }
      throw new Error(message);
    }

    updateResult(result);
  }catch(error){
    console.error(error);
    showToast(error.message || "Could not connect to /predict.");
  }finally{
    setLoading(false);
  }
});

demoBtn.addEventListener("click",()=>{
  const demo = {
    person_age:32,
    person_income:720000,
    person_home_ownership:"MORTGAGE",
    person_emp_length:7,
    loan_intent:"PERSONAL",
    loan_grade:"A",
    loan_amnt:100000,
    loan_int_rate:11.5,
    loan_percent_income:0.17,
    cb_person_default_on_file:"N",
    cb_person_cred_hist_length:6
  };

  Object.entries(demo).forEach(([id,value])=>{
    document.getElementById(id).value = value;
  });
  showToast("Demo profile loaded.");
});

resetBtn.addEventListener("click",()=>{
  form.reset();
  document.getElementById("person_age").value = 30;
  document.getElementById("person_income").value = 600000;
  document.getElementById("person_emp_length").value = 5;
  document.getElementById("loan_amnt").value = 100000;
  document.getElementById("loan_int_rate").value = 11.5;
  document.getElementById("loan_percent_income").value = 0.17;
  document.getElementById("cb_person_cred_hist_length").value = 6;

  probability.textContent = "0.0";
  probMetric.textContent = "—";
  thresholdMetric.textContent = "—";
  verdictMetric.textContent = "Awaiting";
  gaugeVerdict.textContent = "READY";
  shieldIcon.textContent = "✓";
  resultState.textContent = "AWAITING INPUT";
  resultPanel.classList.remove("high-risk","low-risk","updated");
  gauge.style.background = "conic-gradient(var(--gold) 0deg, rgba(72,91,105,.25) 0deg 360deg)";
  riskPercent.innerHTML = `0.0% <small>(lower is better)</small>`;
  riskFill.style.width = "0";
  thresholdPin.style.left = "0";
  resultPanel.style.borderColor = "";
  showToast("Application reset.");
});

document.getElementById("loan_amnt").addEventListener("input", updateRatio);
document.getElementById("person_income").addEventListener("input", updateRatio);

function updateRatio(){
  const income = Number(document.getElementById("person_income").value);
  const loan = Number(document.getElementById("loan_amnt").value);
  if(income > 0 && loan >= 0){
    document.getElementById("loan_percent_income").value = (loan/income).toFixed(3);
  }
}

/* --- 3D pointer interaction --- */
const gaugeWrap = document.getElementById("gaugeWrap");
const resultPanelEl = document.getElementById("resultPanel");

if (gaugeWrap && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  gaugeWrap.addEventListener("pointermove", (event) => {
    const rect = gaugeWrap.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    gaugeWrap.style.transform = `perspective(700px) rotateX(${-y * 7}deg) rotateY(${x * 9}deg)`;
  });
  gaugeWrap.addEventListener("pointerleave", () => {
    gaugeWrap.style.transform = "";
  });
}

function resultImpact(){
  if (!resultPanelEl || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  resultPanelEl.animate(
    [
      {transform:"translateY(10px) scale(.985)", opacity:.72},
      {transform:"translateY(-3px) scale(1.008)", opacity:1},
      {transform:"translateY(0) scale(1)", opacity:1}
    ],
    {duration:650, easing:"cubic-bezier(.2,.8,.2,1)"}
  );
}
const originalUpdateResult = updateResult;
updateResult = function(data){
  originalUpdateResult(data);
  resultImpact();
};
