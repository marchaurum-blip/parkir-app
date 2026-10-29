// Satu-satunya titik kontak FE -> BE (barrier). Dibuat dengan bantuan Antigravity CLI (Claude).
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export async function api(path, method = 'GET', body) {
  const token = localStorage.getItem('token');
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}
