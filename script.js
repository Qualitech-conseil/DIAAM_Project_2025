import { supabase } from "./supabase.js";

// =======================================================
// 1️⃣ Récupération des paramètres d’URL (client + machine)
// =======================================================
const urlParams = new URLSearchParams(window.location.search);
const clientId = urlParams.get("client");
const machineId = urlParams.get("machine");

// Vérification paramètres obligatoires
if (!clientId || !machineId) {
    document.getElementById("app").innerHTML =
        "<p>Paramètres manquants dans l’URL. Format : ?client=xxx&machine=yyy</p>";
    throw new Error("Client ou Machine manquant");
}

// Eléments HTML
const logoEl = document.getElementById("client-logo");
const titleEl = document.getElementById("form-title");
const formEl = document.getElementById("survey-form");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");

// Données chargées
let CONFIG = null; 
let MACHINE = null;

// ============================================
// 2️⃣ Chargement du fichier config client
// ============================================
async function loadClientConfig() {
    const response = await fetch(`clients/${clientId}/config.json`);

    if (!response.ok) {
        document.getElementById("app").innerHTML =
            "<p>Impossible de charger la configuration du client.</p>";
        throw new Error("Erreur config client");
    }

    CONFIG = await response.json();

    // Affichage du logo du client
    logoEl.src = `clients/${clientId}/${CONFIG.logo}`;
    titleEl.textContent = CONFIG.questions_title || "Sondage";
}

// ============================================
// 3️⃣ Chargement du fichier machine
// ============================================
async function loadMachineConfig() {
    const response = await fetch(`clients/${clientId}/machines/${machineId}.json`);

    if (!response.ok) {
        document.getElementById("app").innerHTML =
            "<p>Impossible de charger la configuration de la machine.</p>";
        throw new Error("Erreur config machine");
    }

    MACHINE = await response.json();
}

// ============================================
// 4️⃣ Construction dynamique du formulaire
// ============================================
function buildForm() {
    formEl.innerHTML = "";

    CONFIG.categories.forEach(category => {
        const block = document.createElement("div");
        block.className = "category-block";

        const title = document.createElement("h3");
        title.textContent = category.question;
        block.appendChild(title);

        // Génération options (checkbox)
        category.options.forEach(option => {
            const line = document.createElement("div");
            line.innerHTML = `
                <label>
                    <input 
                        type="checkbox" 
                        data-category="${category.id}" 
                        value="${option}"
                    />
                    ${option}
                </label>
            `;
            block.appendChild(line);
        });

        // Champ "Autre" si activé
        if (category.allow_other) {
            const other = document.createElement("div");
            other.innerHTML = `
                <label>
                    <input 
                        type="checkbox" 
                        data-category="${category.id}" 
                        value="Autre"
                    /> Autre
                </label>
                <input 
                    type="text" 
                    id="other-${category.id}" 
                    placeholder="Précisez…" 
                    style="display:none;margin-left:10px;"
                />
            `;
            block.appendChild(other);
        }

        formEl.appendChild(block);
    });

    // Gestion max choix & champs "autre"
    formEl.addEventListener("change", handleFormChange);

    submitBtn.style.display = "block";
}

// ============================================
// 5️⃣ Gestion des interactions du formulaire
// ============================================
function handleFormChange(e) {
    const input = e.target;
    if (!input.dataset.category) return;

    const categoryId = input.dataset.category;
    const category = CONFIG.categories.find(c => c.id === categoryId);

    if (!category) return;

    const maxChoices = category.max_choices || 5;

    // Afficher caché champ autre
    if (input.value === "Autre") {
        const textField = document.getElementById(`other-${categoryId}`);
        textField.style.display = input.checked ? "inline-block" : "none";
    }

    // Limite de choix
    const allCheckboxes = formEl.querySelectorAll(`input[data-category="${categoryId}"]`);
    const checked = Array.from(allCheckboxes).filter(c => c.checked);

    if (checked.length > maxChoices) {
        input.checked = false;
        alert(`Vous ne pouvez sélectionner que ${maxChoices} choix maximum.`);
    }
}

// ============================================
// 6️⃣ Envoi des données dans Supabase
// ============================================
async function submitForm() {
    statusEl.textContent = "Enregistrement…";

    const rawResponses = [];

    CONFIG.categories.forEach(category => {
        const checkboxes = formEl.querySelectorAll(`input[data-category="${category.id}"]`);
        const selected = Array.from(checkboxes).filter(c => c.checked);

        const choices = selected
            .filter(c => c.value !== "Autre")
            .map(c => c.value);

        let other = null;
        if (selected.some(c => c.value === "Autre")) {
            const field = document.getElementById(`other-${category.id}`);
            other = field.value || null;
        }

        rawResponses.push({
            id: category.id,
            question: category.question,
            choices,
            other
        });
    });

    const payload = {
        client_id: clientId,
        machine_id: machineId,
        raw_data: { machine: MACHINE, categories: rawResponses }
    };

    const { error } = await supabase.from("responses").insert(payload);

    if (error) {
        statusEl.textContent = "Erreur d'enregistrement.";
        console.error(error);
        return;
    }

    statusEl.textContent = "Merci ! Vos réponses ont été enregistrées.";
    submitBtn.disabled = true;
    formEl.querySelectorAll("input").forEach(i => (i.disabled = true));
}

// ============================================
// 7️⃣ Initialisation globale
// ============================================
async function init() {
    await loadClientConfig();
    await loadMachineConfig();
    buildForm();
}

submitBtn.addEventListener("click", submitForm);

init();

