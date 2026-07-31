export async function onRequest({ request, params }) {
  const url = new URL(request.url);
  const path = (params.path || []).join('/');
  const target = `https://aiviral-backend.onrender.com/api/${path}${url.search}`;

  return fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
}
