
// ---------------- PARAMÈTRES CLIENT ----------------
const urlParams = new URLSearchParams(window.location.search);
const clientId = urlParams.get("client");
const machineId = urlParams.get("machine");

if (!clientId || !machineId) {
    document.getElementById("app").innerHTML =
        "<p>Aucun client ou machine spécifié. Ajoutez ?client=xxx&machine=yyy dans l'URL.</p>";
    throw new Error("Client ou machine manquant"); // stoppe l'exécution
}
// ---------------- SUPABASE ----------------
const SUPABASE_URL = "https://vawvmiosgslvykfqxffs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd3ZtaW9zZ3NsdnlrZnF4ZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjcxNTAsImV4cCI6MjA3OTU0MzE1MH0.T_q5fT1PCOt_pwEFdoKqePFYp7N4IXZSN1XA3HGG5v8"; // ton anon key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ---------------- VARIABLES GLOBALES ----------------
let CLIENT_CONFIG = null;

// ---------------- CHARGEMENT CONFIG ----------------
async function loadConfig() {
    try {
        const response = await fetch(`clients/${clientId}/config.json`)
        if (!res.ok) throw new Error("Impossible de charger la config");
        CLIENT_CONFIG = await res.json();

        // logo et titre
        document.getElementById("client-logo").src = CLIENT_CONFIG.logo || "";
        document.getElementById("form-title").innerText = CLIENT_CONFIG.title || "Sondage";

        buildForm(CLIENT_CONFIG.categories);

        document.getElementById("submit-btn").style.display = "block";
    } catch (err) {
        console.error(err);
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
        catTitle.innerText = cat.label || cat.id || "Catégorie";
        catBlock.appendChild(catTitle);

        if (!Array.isArray(cat.questions) || cat.questions.length === 0) {
            const empty = document.createElement("div");
            empty.style.color = "#666";
            empty.style.fontSize = "0.95rem";
            empty.innerText = "Aucune question définie.";
            catBlock.appendChild(empty);
            form.appendChild(catBlock);
            return;
        }

        cat.questions.forEach(question => {
            const qBlock = document.createElement("div");
            qBlock.className = "question-block";
            qBlock.dataset.category = cat.id;
            qBlock.dataset.question = question.id;
            qBlock.style.display = "flex";
            qBlock.style.flexDirection = "column";
            qBlock.style.gap = "8px";
            qBlock.style.padding = "8px 6px";
            qBlock.style.borderBottom = "1px solid #eee";

            const qLabel = document.createElement("h3");
            qLabel.innerText = question.label || question.id;
            qBlock.appendChild(qLabel);

            const optsContainer = document.createElement("div");
            optsContainer.style.display = "flex";
            optsContainer.style.flexDirection = "column";
            optsContainer.style.gap = "6px";

            const choices = Array.isArray(question.choices) ? question.choices : [];
            choices.forEach(choice => {
                const label = document.createElement("label");
                label.style.display = "flex";
                label.style.alignItems = "center";
                label.style.gap = "8px";

                const input = document.createElement("input");
                input.type = "checkbox";
                input.className = "choice";
                input.dataset.category = cat.id;
                input.dataset.question = question.id;
                input.value = choice;

                const text = document.createElement("span");
                text.innerText = choice;

                label.appendChild(input);
                label.appendChild(text);
                optsContainer.appendChild(label);
            });

            // AUTRE
            const otherWrapper = document.createElement("div");
            otherWrapper.style.display = "flex";
            otherWrapper.style.alignItems = "center";
            otherWrapper.style.gap = "8px";
            otherWrapper.style.marginTop = "6px";

            const otherLabel = document.createElement("label");
            otherLabel.style.display = "flex";
            otherLabel.style.alignItems = "center";
            otherLabel.style.gap = "8px";

            const otherCheckbox = document.createElement("input");
            otherCheckbox.type = "checkbox";
            otherCheckbox.className = "choice";
            otherCheckbox.dataset.category = cat.id;
            otherCheckbox.dataset.question = question.id;
            otherCheckbox.value = "Autre";

            const otherTextLabel = document.createElement("span");
            otherTextLabel.innerText = "Autre";

            otherLabel.appendChild(otherCheckbox);
            otherLabel.appendChild(otherTextLabel);

            const otherInput = document.createElement("input");
            otherInput.type = "text";
            otherInput.id = `other-${cat.id}-${question.id}`;
            otherInput.placeholder = "Précisez";
            otherInput.style.display = "none";
            otherInput.style.flex = "1";

            otherWrapper.appendChild(otherLabel);
            otherWrapper.appendChild(otherInput);
            optsContainer.appendChild(otherWrapper);

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
    form.removeEventListener('change', form._changeHandler, true);

    const handler = function(e) {
        const el = e.target;
        if (!el.classList || !el.classList.contains('choice')) return;

        const cat = el.dataset.category;
        const q = el.dataset.question;

        if (!cat || !q) return;

        if (el.value === "Autre") {
            const otherField = document.getElementById(`other-${cat}-${q}`);
            if (otherField) otherField.style.display = el.checked ? 'inline-block' : 'none';
        }

        const checked = Array.from(form.querySelectorAll(`.choice[data-category="${cat}"][data-question="${q}"]:checked`));
        if (checked.length > 5) {
            el.checked = false;
            alert("Vous pouvez sélectionner au maximum 5 réponses pour cette question.");
        }
    };

    form._changeHandler = handler;
    form.addEventListener('change', handler, true);
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

            const choices = selected.map(s => s.value);
            const otherValue = choices.includes("Autre") ? document.getElementById(`other-${cat.id}-${question.id}`).value : null;

            dataToInsert.push({
                client_id: clientId,
                machine_id: machineId,
                category: cat.label,
                question: question.label,
                choices,
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



