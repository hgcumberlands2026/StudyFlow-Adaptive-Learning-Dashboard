// StudyFlow Adaptive Learning Dashboard
// A transparent, local, online preference-learning recommender.
// It is a lightweight ML-inspired learning model, not a generative AI or cloud LLM.

const lessons = [
  {id:"python",title:"Python Foundations",icon:"🐍",topic:"Programming",level:"Beginner",minutes:18,description:"Build confidence with variables, conditions, loops, and small functions.",content:["Start with a short concept explanation.","Try a small code example and predict its output.","Complete a practice task, then review the explanation."]},
  {id:"statistics",title:"Applied Statistics",icon:"📊",topic:"Analytics",level:"Intermediate",minutes:24,description:"Interpret distributions, confidence intervals, and practical statistical results.",content:["Review the purpose of descriptive statistics.","Compare a sample mean with a population parameter.","Explain what a confidence interval communicates."]},
  {id:"machine-learning",title:"Machine Learning Basics",icon:"🧠",topic:"Artificial Intelligence",level:"Intermediate",minutes:26,description:"Understand features, model training, prediction, and evaluation.",content:["Separate training data from test data.","Describe how a model learns a relationship.","Compare accuracy with precision and recall."]},
  {id:"cloud",title:"Cloud Computing Essentials",icon:"☁️",topic:"Cloud",level:"Beginner",minutes:16,description:"Explore cloud service models, scalability, and shared responsibility.",content:["Compare IaaS, PaaS, and SaaS.","Identify one security responsibility of the provider and customer.","Explain why elasticity matters for variable demand."]},
  {id:"deep-learning",title:"Neural Network Concepts",icon:"🕸️",topic:"Artificial Intelligence",level:"Advanced",minutes:32,description:"Explore layers, activation functions, loss, and model optimization.",content:["Identify input, hidden, and output layers.","Explain the role of an activation function.","Describe how loss guides parameter updates."]},
  {id:"data-visualization",title:"Data Visualization",icon:"📈",topic:"Analytics",level:"Beginner",minutes:20,description:"Choose charts that communicate comparisons, trends, and distributions.",content:["Match a line chart to a time series.","Use a bar chart to compare categories.","Check that labels and scales do not mislead."]}
];

const STORAGE_KEY = "studyflow-adaptive-profile-v1";
const defaultProfile = () => ({
  topicWeights: Object.fromEntries([...new Set(lessons.map(x=>x.topic))].map(t=>[t,1])),
  difficulty: 0,
  interactions: 0,
  feedback: {too_easy:0,right:0,too_hard:0},
  recent: []
});
let profile = loadProfile();
let activeLesson = null;

function loadProfile(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? {...defaultProfile(),...saved,topicWeights:{...defaultProfile().topicWeights,...saved.topicWeights}} : defaultProfile();
  } catch { return defaultProfile(); }
}
function saveProfile(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(profile)); }

function updateTopicModel(topic){
  // Exponential moving update: positive interaction increases the topic preference weight.
  const old = profile.topicWeights[topic] ?? 1;
  profile.topicWeights[topic] = Math.min(5, old * 0.82 + 1.0 * 0.18 + 0.18);
  profile.interactions += 1;
  profile.recent.unshift({topic,at:Date.now()});
  profile.recent = profile.recent.slice(0,20);
  saveProfile();
}
function updateDifficultyModel(feedback){
  profile.feedback[feedback] = (profile.feedback[feedback] || 0) + 1;
  // A bounded online update: too easy raises desired challenge; too hard lowers it.
  const delta = feedback === "too_easy" ? 0.18 : feedback === "too_hard" ? -0.18 : 0.02;
  profile.difficulty = Math.max(-1,Math.min(1,profile.difficulty * 0.75 + delta));
  profile.interactions += 1;
  saveProfile();
}
function recommendedLevel(){
  if(profile.difficulty > 0.28) return "Advanced";
  if(profile.difficulty < -0.28) return "Beginner";
  return "Intermediate";
}
function scoreLesson(lesson){
  const topicScore = profile.topicWeights[lesson.topic] || 1;
  const desired = recommendedLevel();
  const levelScore = lesson.level === desired ? 0.8 : lesson.level === "Intermediate" ? 0.35 : 0;
  const recentPenalty = profile.recent.slice(0,3).some(x=>x.topic===lesson.topic) ? 0.12 : 0;
  return topicScore + levelScore - recentPenalty;
}
function render(){
  const sorted = [...lessons].sort((a,b)=>scoreLesson(b)-scoreLesson(a));
  const list = document.getElementById("lesson-list");
  list.innerHTML = "";
  sorted.forEach((lesson,index)=>{
    const card = document.createElement("article");
    card.className = "lesson-card";
    card.innerHTML = `<div class="lesson-top"><span class="topic-icon">${lesson.icon}</span>${index===0?'<span class="tag">Recommended</span>':`<span class="tag">${lesson.level}</span>`}</div>
      <h3>${lesson.title}</h3><p>${lesson.description}</p>
      <div class="lesson-meta"><span>${lesson.topic} · ${lesson.minutes} min</span><button class="button" type="button" data-open="${lesson.id}">Open lesson</button></div>`;
    list.appendChild(card);
  });
  list.querySelectorAll("[data-open]").forEach(btn=>btn.addEventListener("click",()=>openLesson(btn.dataset.open)));
  renderProfile();
  document.getElementById("recommend-title").textContent = sorted[0].title;
  document.getElementById("recommend-detail").textContent = `Suggested from your interaction pattern · ${recommendedLevel()} learning level`;
  document.getElementById("interaction-count").textContent = `${profile.interactions} learning interactions recorded`;
  document.getElementById("learning-status").textContent = profile.interactions ? "Preference model updated" : "Learning your preferences";
}
function renderProfile(){
  const area = document.getElementById("profile-bars");
  area.innerHTML = "";
  const values = Object.entries(profile.topicWeights);
  const max = Math.max(1,...values.map(x=>x[1]));
  values.forEach(([topic,value])=>{
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `<span>${topic}</span><strong>${Math.round(value/max*100)}%</strong><div class="bar-track"><div class="bar-fill" style="width:${value/max*100}%"></div></div>`;
    area.appendChild(row);
  });
}
function openLesson(id){
  activeLesson = lessons.find(x=>x.id===id);
  updateTopicModel(activeLesson.topic);
  document.getElementById("active-title").textContent = activeLesson.title;
  document.getElementById("active-description").textContent = activeLesson.description;
  document.getElementById("lesson-content").innerHTML = `<strong>Learning activity</strong><ul>${activeLesson.content.map(x=>`<li>${x}</li>`).join("")}</ul>`;
  document.getElementById("lesson-view").hidden = false;
  render();
  document.getElementById("lesson-view").scrollIntoView({behavior:"smooth",block:"start"});
}
document.querySelectorAll(".feedback-button").forEach(btn=>btn.addEventListener("click",()=>{
  if(!activeLesson) return;
  updateDifficultyModel(btn.dataset.feedback);
  document.getElementById("recommend-detail").textContent = `Feedback saved. Next suggested level: ${recommendedLevel()}.`;
  render();
  document.getElementById("lesson-view").hidden = true;
  activeLesson = null;
}));
document.getElementById("close-lesson").addEventListener("click",()=>{document.getElementById("lesson-view").hidden=true;activeLesson=null;});
document.getElementById("reset-model").addEventListener("click",()=>{
  profile=defaultProfile();saveProfile();render();
  document.getElementById("lesson-view").hidden=true;activeLesson=null;
});
document.getElementById("density").addEventListener("change",e=>{
  document.body.classList.remove("compact","comfortable");
  if(e.target.value==="auto"){
    const avg=profile.interactions?profile.difficulty:0;
    document.body.classList.add(avg < -0.3 ? "comfortable" : "compact");
  } else document.body.classList.add(e.target.value);
});
document.getElementById("contrast").addEventListener("change",e=>document.body.classList.toggle("high-contrast",e.target.checked));
document.getElementById("larger-text").addEventListener("change",e=>document.body.classList.toggle("large-text",e.target.checked));
render();
