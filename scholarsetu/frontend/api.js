// Frontend talks to the backend ONLY through this file. Nothing secret lives here.
const API = window.API_URL || "http://localhost:3000";
async function call(path, body, method = "POST") {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json",
    ...(localStorage.token ? { Authorization: "Bearer " + localStorage.token } : {}) }, body: body && JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw new Error(j.message || "Request failed"); return j;
}
window.api = {
  sendOtp: m => call("/auth/otp/send", { mobile: m }),
  verifyOtp: async (m, o) => { const j = await call("/auth/otp/verify", { mobile: m, otp: o }); localStorage.token = j.accessToken; return j; },
  passwordLogin: async (m, p) => { const j = await call("/auth/password/login", { mobile: m, password: p }); localStorage.token = j.accessToken; return j; },
  passwordRegister: (m, p) => call("/auth/password/register", { mobile: m, password: p }),
  digiLocker: () => { location.href = API + "/auth/digilocker/start"; },
  me: () => call("/auth/me", null, "GET"),
};
