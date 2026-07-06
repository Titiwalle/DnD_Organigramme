const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options
  });

  if (!res.ok) {
    let message = 'Erreur réseau.';
    try {
      const data = await res.json();
      message = data.error || message;
    } catch (e) {
      // pas de corps JSON, on garde le message par défaut
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (username, password) =>
    request('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/logout', { method: 'POST' }),
  me: () => request('/me'),

  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (username, data) =>
    request(`/users/${encodeURIComponent(username)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (username) =>
    request(`/users/${encodeURIComponent(username)}`, { method: 'DELETE' }),

  getCharacters: () => request('/characters'),
  getStatuts: () => request('/statuts'),
  createStatut: (value) => request('/statuts', { method: 'POST', body: JSON.stringify({ value }) }),
  deleteStatut: (value) => request(`/statuts/${encodeURIComponent(value)}`, { method: 'DELETE' }),

  getAffectations: () => request('/affectations'),
  createAffectation: (value, color) => request('/affectations', { method: 'POST', body: JSON.stringify({ value, color }) }),
  updateAffectationColor: (value, color) =>
    request(`/affectations/${encodeURIComponent(value)}`, { method: 'PUT', body: JSON.stringify({ color }) }),
  deleteAffectation: (value) => request(`/affectations/${encodeURIComponent(value)}`, { method: 'DELETE' }),

  getRelationTypes: () => request('/relation-types'),
  createRelationType: (value) => request('/relation-types', { method: 'POST', body: JSON.stringify({ value }) }),
  deleteRelationType: (value) => request(`/relation-types/${encodeURIComponent(value)}`, { method: 'DELETE' }),

  getCanvasLayout: () => request('/canvas-layout'),
  saveCanvasLayout: (data) => request('/canvas-layout', { method: 'PUT', body: JSON.stringify(data) }),
  resetCanvasLayout: () => request('/canvas-layout', { method: 'DELETE' }),

  createCharacter: (data) =>
    request('/characters', { method: 'POST', body: JSON.stringify(data) }),
  updateCharacter: (id, data) =>
    request(`/characters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCharacter: (id) =>
    request(`/characters/${id}`, { method: 'DELETE' }),
  saveTestimony: (id, text) =>
    request(`/characters/${id}/testimony`, {
      method: 'PUT',
      body: JSON.stringify({ text })
    }),
  deleteTestimony: (id) =>
    request(`/characters/${id}/testimony`, { method: 'DELETE' }),

  getRelations: () => request('/relations'),
  createRelation: (data) => request('/relations', { method: 'POST', body: JSON.stringify(data) }),
  deleteRelation: (id) => request(`/relations/${id}`, { method: 'DELETE' })
};
