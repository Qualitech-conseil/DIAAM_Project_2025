const SUPABASE_URL = "https://vawvmiosgslvykfqxffs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd3ZtaW9zZ3NsdnlrZnF4ZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjcxNTAsImV4cCI6MjA3OTU0MzE1MH0.T_q5fT1PCOt_pwEFdoKqePFYp7N4IXZSN1XA3HGG5v8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginSection = document.getElementById("login-section");
const dashboard = document.getElementById("dashboard");

document.getElementById("login-btn").addEventListener("click", login);
document.getElementById("logout-btn").addEventListener("click", logout);

async function login() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    const status = document.getElementById("login-status");

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: pass
    });

    if (error) {
        status.innerText = "Connexion refusée";
    } else {
        loginSection.style.display = "none";
        dashboard.style.display = "block";
        loadResults();
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    loginSection.style.display = "block";
    dashboard.style.display = "none";
}

async function loadResults() {
    const tbody = document.querySelector("#results-table tbody");
    tbody.innerHTML = "";

    const { data, error } = await supabaseClient
        .from("survey_results")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.client_id}</td>
            <td>${row.machine_id}</td>
            <td>${row.category}</td>
            <td>${row.question}</td>
            <td>${row.choice_1 || ""}</td>
            <td>${row.choice_2 || ""}</td>
            <td>${row.choice_3 || ""}</td>
            <td>${row.choice_4 || ""}</td>
            <td>${row.choice_5 || ""}</td>
            <td>${row.created_at}</td>
        `;
        tbody.appendChild(tr);
    });
}
