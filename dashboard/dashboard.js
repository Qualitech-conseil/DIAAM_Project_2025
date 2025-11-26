import config from "../config.json" assert { type: "json" };

const supabase = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON);

/* ---------------------------
    ELEMENTS UI
------------------------------ */
const loginBox = document.getElementById("login-box");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginStatus = document.getElementById("login-status");

/* ---------------------------
    LOGIN ADMIN
------------------------------ */
loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    loginStatus.innerText = "";

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        loginStatus.innerText = "❌ Erreur de connexion : " + error.message;
        return;
    }

    loginStatus.innerText = "✔️ Connexion réussie !";
    await checkSession();
});

/* ---------------------------
    LOGOUT
------------------------------ */
logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("session");
    window.location.reload();
});

/* ---------------------------
    CHECK SESSION ON LOAD
------------------------------ */
async function checkSession() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
        dashboard.classList.add("hidden");
        loginBox.classList.remove("hidden");
        return;
    }

    // Ici, tu pourrais vérifier le rôle dans les metadata :
    // if(data.user.role !== "admin") { ... }

    loginBox.classList.add("hidden");
    dashboard.classList.remove("hidden");

    loadDashboard();
}

checkSession();

/* ---------------------------
    LOAD DATA FOR DASHBOARD
------------------------------ */
async function loadDashboard() {
    const { data, error } = await supabase
        .from("responses")
        .select("*");

    if (error) {
        console.error("Erreur chargement data:", error);
        return;
    }

    displayStats(data);
}

/* ---------------------------
    DISPLAY STATS (Charts)
------------------------------ */
function displayStats(data) {
    // Nombre de réponses par machine
    const machineCount = {};
    data.forEach(r => {
        machineCount[r.machine_id] = (machineCount[r.machine_id] || 0) + 1;
    });

    new Chart(document.getElementById("machinesChart"), {
        type: "bar",
        data: {
            labels: Object.keys(machineCount),
            datasets: [{
                label: "Nombre de formulaires par machine",
                data: Object.values(machineCount),
            }]
        }
    });

    // Choix produits
    const productCount = {};
    data.forEach(r => {
        r.data.forEach(cat => {
            cat.choices.forEach(choice => {
                productCount[choice] = (productCount[choice] || 0) + 1;
            });
        });
    });

    new Chart(document.getElementById("choicesChart"), {
        type: "pie",
        data: {
            labels: Object.keys(productCount),
            datasets: [{
                label: "Produits choisis",
                data: Object.values(productCount),
            }]
        }
    });
}

