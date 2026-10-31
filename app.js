const STORAGE_KEY = "decode-polity-revision-tracker-v1";

const defaultTopics = [
  "Making of Constitution",
  "Salient Features of the Constitution",
  "Preamble — Part 1 and Part 2",
  "Fundamental Rights",
  "DPSP and Fundamental Duties",
  "President and Vice President of India",
  "Prime Minister and Council of Ministers",
  "Parliament",
  "State Legislature",
  "Centre-State Relations",
  "Supreme Court and High Court",
  "Local Government",
  "Constitutional and Non-Constitutional Bodies",
  "Emergency & Constitutional Amendment",
  "New Criminal Laws 2023"
];

function blankState() {
  return {
    studentName: "",
    targetDate: "",
    lectures: defaultTopics.map(topic => ({
      topic, lecture: false, revisions: [false, false, false], synopsis: false, score: "", total: ""
    })),
    review: { revisit: "", confusing: "", mockPlan: "" }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankState();
    const saved = JSON.parse(raw);
    const base = blankState();
    return {
      ...base, ...saved,
      lectures: base.lectures.map((item, i) => ({
        ...item, ...(saved.lectures?.[i] || {}),
        revisions: Array.from({ length: 3 }, (_, j) => Boolean(saved.lectures?.[i]?.revisions?.[j]))
      })),
      review: { ...base.review, ...(saved.review || {}) }
    };
  } catch (error) {
    console.warn("Could not load saved tracker data:", error);
    return blankState();
  }
}

let state = loadState();
const list = document.getElementById("lectureList");
const saveStatus = document.getElementById("saveStatus");

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveStatus.textContent = "✓ Saved automatically in this browser";
  } catch (error) {
    saveStatus.textContent = "Could not save — export a backup";
    console.error(error);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderLectures() {
  list.innerHTML = state.lectures.map((item, index) => `
    <article class="lecture-card" data-index="${index}">
      <div class="lecture-top">
        <span class="lecture-number">LEC ${String(index + 1).padStart(2, "0")}</span>
        <textarea class="topic" aria-label="Lecture ${index + 1} topic" rows="2" data-field="topic">${escapeHTML(item.topic)}</textarea>
      </div>
      <div class="card-body">
        <div class="lecture-group">
          <div class="group-title">LECTURE</div>
          <label class="check-row"><input type="checkbox" data-check="lecture" ${item.lecture ? "checked" : ""}> DONE</label>
        </div>
        <div class="revision-group">
          <div class="group-title">REVISION</div>
          <div class="revision-checks">
            ${item.revisions.map((checked, j) => `<label class="check-row"><input type="checkbox" data-revision="${j}" ${checked ? "checked" : ""}> ${j + 1}</label>`).join("")}
          </div>
        </div>
        <div class="synopsis-group">
          <div class="group-title">SYNOPSIS</div>
          <label class="check-row"><input type="checkbox" data-check="synopsis" ${item.synopsis ? "checked" : ""}> DONE</label>
        </div>
        <div class="score-group">
          <span class="score-label">TEST SCORE</span>
          <input class="score-input" type="number" min="0" placeholder="Score" aria-label="Score" data-score="score" value="${escapeHTML(item.score)}">
          <span class="score-separator">/</span>
          <input class="score-input" type="number" min="0" placeholder="Total" aria-label="Total marks" data-score="total" value="${escapeHTML(item.total)}">
        </div>
      </div>
    </article>
  `).join("");
  updateProgress();
}

function updateProgress() {
  const completed = state.lectures.reduce((sum, item) =>
    sum + Number(item.lecture) + item.revisions.filter(Boolean).length + Number(item.synopsis), 0);
  const total = state.lectures.length * 5;
  const percent = Math.round(completed / total * 100);
  document.getElementById("progressText").textContent = `${percent}% complete`;
  document.getElementById("progressBar").style.width = `${percent}%`;
  document.getElementById("progressDetail").textContent = `${completed} of ${total} activities completed`;
}

document.getElementById("studentName").value = state.studentName;
document.getElementById("targetDate").value = state.targetDate;
for (const id of ["revisit", "confusing", "mockPlan"]) {
  document.getElementById(id).value = state.review[id];
}
renderLectures();

list.addEventListener("change", event => {
  const card = event.target.closest(".lecture-card");
  if (!card) return;
  const index = Number(card.dataset.index);
  const item = state.lectures[index];
  if (event.target.dataset.check) item[event.target.dataset.check] = event.target.checked;
  if (event.target.dataset.revision !== undefined) item.revisions[Number(event.target.dataset.revision)] = event.target.checked;
  if (event.target.dataset.score) item[event.target.dataset.score] = event.target.value;
  saveState();
  updateProgress();
});

list.addEventListener("input", event => {
  const card = event.target.closest(".lecture-card");
  if (!card) return;
  const index = Number(card.dataset.index);
  if (event.target.dataset.field === "topic") {
    state.lectures[index].topic = event.target.value;
    saveState();
  }
  if (event.target.dataset.score) {
    state.lectures[index][event.target.dataset.score] = event.target.value;
    saveState();
  }
});

document.getElementById("studentName").addEventListener("input", event => {
  state.studentName = event.target.value; saveState();
});
document.getElementById("targetDate").addEventListener("change", event => {
  state.targetDate = event.target.value; saveState();
});
for (const id of ["revisit", "confusing", "mockPlan"]) {
  document.getElementById(id).addEventListener("input", event => {
    state.review[id] = event.target.value; saveState();
  });
}

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "polity-revision-tracker-backup.json";
  link.click(); URL.revokeObjectURL(url);
});

document.getElementById("importFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.lectures) || imported.lectures.length !== 15) {
      throw new Error("This file is not a valid Polity Tracker backup.");
    }
    const base = blankState();
    state = {
      ...base, ...imported,
      lectures: base.lectures.map((item, i) => ({
        ...item, ...(imported.lectures[i] || {}),
        revisions: Array.from({ length: 3 }, (_, j) => Boolean(imported.lectures[i]?.revisions?.[j]))
      })),
      review: { ...base.review, ...(imported.review || {}) }
    };
    saveState();
    document.getElementById("studentName").value = state.studentName;
    document.getElementById("targetDate").value = state.targetDate;
    for (const id of ["revisit", "confusing", "mockPlan"]) document.getElementById(id).value = state.review[id];
    renderLectures();
    alert("Backup imported successfully.");
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  } finally {
    event.target.value = "";
  }
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset all tracker data? This will clear your saved progress in this browser.")) return;
  state = blankState();
  saveState();
  document.getElementById("studentName").value = "";
  document.getElementById("targetDate").value = "";
  for (const id of ["revisit", "confusing", "mockPlan"]) document.getElementById(id).value = "";
  renderLectures();
});
