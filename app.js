// JARVIS starter: add your Supabase project URL and anon/publishable key below.
const SUPABASE_URL = "https://tffjzsvvcmbaplgbfvjk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ag6S8qpW5qaq0I8tWcVhhg_EL1j4mDs";

const $ = (id) => document.getElementById(id);
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.includes("PASTE_");
let client = null;
let currentUser = null;

function status(id, message) { $(id).textContent = message; }
function showApp(user) {
  currentUser = user;
  $("authPanel").classList.add("hidden");
  $("appPanel").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  $("userEmail").textContent = user.email || "Signed-in account";
  loadProfile();
  loadMemories();
}
function showAuth() {
  currentUser = null;
  $("authPanel").classList.remove("hidden");
  $("appPanel").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
}
async function requireClient() {
  if (!configured || !window.supabase) {
    status("authStatus", "Setup needed: add your Supabase URL and key in app.js, then publish again.");
    return false;
  }
  if (!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}
async function signIn() {
  if (!await requireClient()) return;
  const email = $("email").value.trim(), password = $("password").value;
  if (!email || !password) return status("authStatus", "Enter your email and password.");
  status("authStatus", "Signing in…");
  const {error} = await client.auth.signInWithPassword({email,password});
  status("authStatus", error ? error.message : "Signed in.");
}
async function signUp() {
  if (!await requireClient()) return;
  const email = $("email").value.trim(), password = $("password").value;
  if (!email || password.length < 6) return status("authStatus", "Enter an email and a password with at least 6 characters.");
  status("authStatus", "Creating your account…");
  const {data,error} = await client.auth.signUp({email,password});
  if (error) return status("authStatus", error.message);
  status("authStatus", data.session ? "Account created." : "Check your email to confirm your account, then sign in.");
}
async function googleSignIn() {
  if (!await requireClient()) return;
  const {error} = await client.auth.signInWithOAuth({
    provider:"google",
    options:{redirectTo:window.location.origin + window.location.pathname}
  });
  if (error) status("authStatus", error.message);
}
async function loadProfile() {
  const {data,error} = await client.from("jarvis_profiles").select("assistant_name").eq("user_id",currentUser.id).maybeSingle();
  if (error) return status("profileStatus", "Profile load issue: " + error.message);
  const name = data?.assistant_name || "JARVIS";
  $("assistantName").value = name;
  $("assistantTitle").textContent = name;
}
async function saveName() {
  const name = $("assistantName").value.trim();
  if (!name) return status("profileStatus","Enter a name first.");
  const {error} = await client.from("jarvis_profiles").upsert({user_id:currentUser.id,assistant_name:name},{onConflict:"user_id"});
  status("profileStatus", error ? error.message : "Assistant name saved to your account.");
  if (!error) $("assistantTitle").textContent = name;
}
async function saveMemory() {
  const content = $("memoryInput").value.trim();
  if (!content) return status("memoryStatus","Write a note first.");
  const {error} = await client.from("jarvis_memories").insert({user_id:currentUser.id,content});
  if (error) return status("memoryStatus","Could not save: " + error.message);
  $("memoryInput").value = "";
  status("memoryStatus","Saved to your cloud account.");
  loadMemories();
}
async function loadMemories() {
  const {data,error} = await client.from("jarvis_memories").select("id,content,created_at").eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(20);
  if (error) return status("memoryStatus","Memory table setup needed: " + error.message);
  $("memoryList").innerHTML = "";
  (data || []).forEach(item => {
    const div = document.createElement("div");
    div.className = "memory-item";
    const content = document.createElement("div");
    content.textContent = item.content;
    const small = document.createElement("small");
    small.textContent = new Date(item.created_at).toLocaleString();
    div.append(content,small);
    $("memoryList").append(div);
  });
}
async function boot() {
  $("signInBtn").addEventListener("click",signIn);
  $("signUpBtn").addEventListener("click",signUp);
  $("googleBtn").addEventListener("click",googleSignIn);
  $("logoutBtn").addEventListener("click",async()=>{if(client) await client.auth.signOut();showAuth();});
  $("saveNameBtn").addEventListener("click",saveName);
  $("saveMemoryBtn").addEventListener("click",saveMemory);
  if (!await requireClient()) return;
  const {data:{session}} = await client.auth.getSession();
  if (session?.user) showApp(session.user);
  client.auth.onAuthStateChange((_event,session)=>{if(session?.user) showApp(session.user); else showAuth();});
}
boot();
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
}

/* ===== JARVIS VOICE + LOCAL BRAIN ===== */

const jarvisVoice = {
  speak(text) {
    if (!("speechSynthesis" in window)) {
      console.log("Speech synthesis unavailable");
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-IN";
    speech.rate = 1;
    speech.pitch = 0.9;

    window.speechSynthesis.speak(speech);
  },

  listen(onResult) {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };

    recognition.onerror = (event) => {
      console.log("Voice error:", event.error);
    };

    recognition.start();
  },

  reply(message) {
    const text = message.toLowerCase().trim();
    let answer;

    if (text.includes("hello") || text.includes("hi jarvis")) {
      answer = "Hello. JARVIS systems are online. How may I help?";
    } 
    else if (text.includes("your name")) {
      answer = "I am JARVIS, your personal assistant.";
    }
    else if (text.includes("time")) {
      answer = "The current time is " +
        new Date().toLocaleTimeString("en-IN");
    }
    else if (text.includes("date")) {
      answer = "Today is " +
        new Date().toLocaleDateString("en-IN");
    }
    else if (text.includes("open youtube")) {
      answer = "Opening YouTube.";
      window.open("https://www.youtube.com/", "_blank");
    }
    else if (text.includes("open google")) {
      answer = "Opening Google.";
      window.open("https://www.google.com/", "_blank");
    }
    else if (text.includes("how are you")) {
      answer = "All systems are functioning normally.";
    }
    else {
      answer = "I heard you say: " + message +
        ". My advanced AI connection is not enabled yet.";
    }

    this.speak(answer);
    return answer;
  }
};

/* ===== END JARVIS VOICE + LOCAL BRAIN ===== */
