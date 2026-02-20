const confiaveis = [
  "bbc.com",
  "reuters.com",
  "apnews.com",
  "nytimes.com",
  "theguardian.com"
];

const neutros = [
  "gov.br",
  "un.org",
  "who.int",
  "ibge.gov.br"
];

const sensacionalistas = [
  "metropoles.com",
  "r7.com",
  "terra.com.br"
];

const desinformacao = [
  "infowars.com",
  "naturalnews.com"
];

const pesos = {
  A: 3,
  B: 1,
  C: -2,
  D: -5
};

function classificar(url) {
  const dominio = new URL(url).hostname.replace("www.", "");

  if (confiaveis.some(site => dominio.includes(site))) return "A";
  if (neutros.some(site => dominio.includes(site))) return "B";
  if (sensacionalistas.some(site => dominio.includes(site))) return "C";
  if (desinformacao.some(site => dominio.includes(site))) return "D";

  return "B";
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab.url || !tab.url.startsWith("http")) return;

  processarUrl(tab.url);
});

function processarUrl(url) {
  const categoria = classificar(url);
  const peso = pesos[categoria];

  chrome.storage.local.get(["historico"], (result) => {
    let historico = result.historico || [];

    historico.push(peso);

    if (historico.length > 20) {
      historico.shift();
    }

    chrome.storage.local.set({ historico });
  });
}