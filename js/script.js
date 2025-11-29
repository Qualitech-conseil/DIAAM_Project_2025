let CONFIG = null;
let supabaseClient = null;

/* --------------------------
   1. CHARGEMENT DU CONFIG.JSON
--------------------------- */
async function loadConfig() {
    try {
        const res = await fetch(`./clients/${clientId}/config.json`);
        CONFIG = await res.json();

        // Init Supabase
        supabaseClient = window.supabase.createClient(
            CONFIG.supabase.url,
            CONFIG.supabase.anonKey
        );

        initForm();
    } catch (err) {
        console.error("Erreur chargement config.json :", err);
        alert("Impossible de charger la configuration.");
    }
}

/* --------------------------
   2. INITIALISATION DU FORMULAIRE
--------------------------- */
function initForm() {
    const categoriesContainer = document.getElementById("categories-container");

    CONFIG.categories.forEach(cat => {
        if (!cat.questions || cat.questions.length === 0) return;

        let block = document.createElement("div");
        block.className = "category-block";
        block.innerHTML = `<h3>${cat.label}</h3>`;

        cat.questions.forEach(question => {
            let qDiv = document.createElement("div");
            qDiv.className = "question-block";

            let html = `
                <label><strong>${question.label}</strong></label>
                <select class="choice-select" data-category="${cat.id}" data-question="${question.id}">
                    <option value="">-- Choisissez --</option>
            `;

            question.choices.forEach(choice => {
                html += `<option value="${choice}">${choice}</option>`;
            });

            html += "</select>";

            qDiv.innerHTML = html;
            block.appendChild(qDiv);
        });

        categoriesContainer.appendChild(block);
    });
}

/* --------------------------
   3. RÉCUPÉRATION PARAMÈTRE CLIENT DANS L’URL
--------------------------- */
function getClientId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("client") || "unknown_client";
}

/* --------------------------
   4. SOUMISSION DU FORMULAIRE
--------------------------- */
async function submitForm(event) {
    event.preventDefault();

    const clientId = getClientId();
    const machineId = document.getElementById("machine-id").value.trim();

    if (!machineId) {
        alert("Merci de renseigner l'identifiant de la machine.");
        return;
    }

    const selects = document.querySelectorAll(".choice-select");
    let rowsToInsert = [];

    CONFIG.categories.forEach(cat => {
        cat.questions.forEach(question => {
            const select = [...selects].find(s =>
                s.dataset.category === cat.id &&
                s.dataset.question === question.id
            );

            if (!select) return;

            rowsToInsert.push({
                client_id: clientId,
                machine_id: machineId,
                category: cat.label,
                question: question.label,

                // jusqu'à 5 choix max (norme option A)
                choice_1: select.value || null,
                choice_2: null,
                choice_3: null,
                choice_4: null,
                choice_5: null,

                created_at: new Date().toISOString()
            });
        });
    });

    // 🔥 Protection -> aucun champ rempli
    const filled = rowsToInsert.some(r => r.choice_1 !== null);
    if (!filled) {
        alert("Merci de sélectionner au moins une réponse.");
        return;
    }

    // 🔥 On ne garde que les réponses réellement choisies
    rowsToInsert = rowsToInsert.filter(r => r.choice_1 !== null);

    /* --------------------------
       5. INSERTION DANS SUPABASE
    --------------------------- */
    const { error } = await supabaseClient
        .from(CONFIG.dashboard.tableName)
        .insert(rowsToInsert);

    if (error) {
        console.error("Supabase insert error :", error);
        alert("Erreur lors de l’envoi. Vérifiez votre configuration.");
        return;
    }

    alert("Vos réponses ont été enregistrées avec succès !");
    document.getElementById("survey-form").reset();
}

/* --------------------------
   6. LANCEMENT
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    loadConfig();

    const form = document.getElementById("survey-form");
    form.addEventListener("submit", submitForm);
});


