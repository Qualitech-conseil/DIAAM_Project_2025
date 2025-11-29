
// ---------------- PARAMÈTRES CLIENT ----------------
const urlParams = new URLSearchParams(window.location.search);
const clientId = urlParams.get("client");
const machineId = urlParams.get("machine");

if (!clientId || !machineId) {
    document.getElementById("app").innerHTML =
        "<p>Aucun client ou machine spécifié. Ajoutez ?client=xxx&machine=yyy dans l'URL.</p>";
    throw new Error("Client ou machine manquant");
}

// ---------------- SUPABASE ----------------
const SUPABASE_URL = "https://vawvmiosgslvykfqxffs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd3ZtaW9zZ3NsdnlrZnF4ZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjcxNTAsImV4cCI6MjA3OTU0MzE1MH0.T_q5fT1PCOt_pwEFdoKqePFYp7N4IXZSN1XA3HGG5v8";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ---------------- VARIABLES GLOBALES ----------------
let CLIENT_CONFIG = null;

// ---------------- CHARGEMENT CONFIG ----------------
async function loadConfig() {
    try {
        const response = await fetch(`clients/${clientId}/config.json`);
        if (!response.ok) throw new Error("Impossible de charger la config");

        CLIENT_CONFIG = await response.json();

        document.getElementById("client-logo").src = CLIENT_CONFIG.logo || "";
        document.getElementById("form-title").innerText = CLIENT_CONFIG.title || "Sondage";

        buildForm(CLIENT_CONFIG.categories);

        document.getElementById("submit-btn").style.display = "block";

    } catch (err) {
        console.error("Erreur config.json :", err);
        document.getElementById("app").innerHTML =
            "<p>Erreur de configuration. Vérifiez le fichier config.json.</p>";
    }
}

// ---------------- BUILD FORM ----------------
function buildForm(categories) {
    const form = document.getElementById("survey-form");
    form.innerHTML = "";

    categories.forEach(cat => {

        const catBlock = document.createElement("div");
        catBlock.className = "category-block";

        const catTitle = document.createElement("h2");
        catTitle.innerText = cat.label || cat.id;
        catBlock.appendChild(catTitle);

        if (!Array.isArray(cat.questions)) return;

        cat.questions.forEach(question => {

            const qBlock = document.createElement("div");
            qBlock.className = "question-block";
            qBlock.dataset.category = cat.id;
            qBlock.dataset.question = question.id;

            qBlock.style.display = "flex";
            qBlock.style.flexDirection = "column";
            qBlock.style.gap = "8px";
            qBlock.style.marginBottom = "12px";
            qBlock.style.padding = "8px";
            qBlock.style.borderBottom = "1px solid #eee";

            const qLabel = document.createElement("h3");
            qLabel.innerText = question.label;
            qBlock.appendChild(qLabel);

            const optsContainer = document.createElement("div");
            optsContainer.style.display = "flex";
            optsContainer.style.flexDirection = "column";
            optsContainer.style.gap = "6px";

            (question.choices || []).forEach(choice => {
                const line = document.createElement("label");
                line.style.display = "flex";
                line.style.alignItems = "center";
                line.style.gap = "8px";

                line.innerHTML = `
                    <input type="checkbox"
                        class="choice"
                        data-category="${cat.id}"
                        data-question="${question.id}"
                        value="${choice}">
                    <span>${choice}</span>
                `;
                optsContainer.appendChild(line);
            });

            const htmlAutre = document.createElement("div");
            htmlAutre.style.display = "flex";
            htmlAutre.style.alignItems = "center";
            htmlAutre.style.gap = "8px";

            htmlAutre.innerHTML = `
                <label style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox"
                        class="choice"
                        data-category="${cat.id}"
                        data-question="${question.id}"
                        value="Autre">
                    <span>Autre</span>
                </label>
                <input type="text"
                       id="other-${cat.id}-${question.id}"
                       placeholder="Précisez"
                       style="display:none;flex:1;">
            `;
            optsContainer.appendChild(htmlAutre);

            qBlock.appendChild(optsContainer);
            catBlock.appendChild(qBlock);
        });

        form.appendChild(catBlock);
    });

    activateRules();
}

// ---------------- RULES ----------------
function activateRules() {
    const form = document.getElementById("survey-form");

    form.removeEventListener("change", form._changeHandler, true);

    const handler = function (e) {
        const el = e.target;
        if (!el.classList.contains("choice")) return;

        const cat = el.dataset.category;
        const q = el.dataset.question;

        if (el.value === "Autre") {
            const otherField = document.getElementById(`other-${cat}-${q}`);
            if (otherField)
                otherField.style.display = el.checked ? "inline-block" : "none";
        }

        const checked = form.querySelectorAll(
            `.choice[data-category="${cat}"][data-question="${q}"]:checked`
        );

        if (checked.length > 5) {
            el.checked = false;
            alert("Vous pouvez sélectionner au maximum 5 éléments.");
        }
    };

    form._changeHandler = handler;
    form.addEventListener("change", handler, true);
}

// ---------------- SUBMIT ----------------
async function submitForm() {
    const status = document.getElementById("status");
    status.innerText = "";

    const form = document.getElementById("survey-form");
    const dataToInsert = [];

    CLIENT_CONFIG.categories.forEach(cat => {
        cat.questions.forEach(question => {
            const qBlock = form.querySelector(`[data-category="${cat.id}"][data-question="${question.id}"]`);
            const selected = Array.from(qBlock.querySelectorAll("input[type='checkbox']:checked"));

            const values = selected.map(s => s.value);
            const otherValue = values.includes("Autre")
                ? document.getElementById(`other-${cat.id}-${question.id}`).value
                : null;

            dataToInsert.push({
                client_id: clientId,
                machine_id: machineId,
                category: cat.label,
                question: question.label,
                choices: values,
                other: otherValue,
                created_at: new Date().toISOString()
            });
        });
    });

    const { error } = await supabaseClient.from("survey_results").insert(dataToInsert);

    if (error) {
        status.innerText = "Erreur lors de l'enregistrement.";
        console.error(error);
    } else {
        status.innerText = "Merci, vos réponses ont été enregistrées.";
        document.getElementById("submit-btn").disabled = true;
    }
}

// ---------------- INIT ----------------
document.getElementById("submit-btn").addEventListener("click", submitForm);
loadConfig();




