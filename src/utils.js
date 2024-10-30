const axios = require('axios');
const fs = require('fs');

async function change_sector(page, sector) {
  const SETORES = {
    GAB_CIV: 1,
    SEC_ADM: 2,
    SEC_FIN: 3,
    SEC_ASS: 4,
    FUN_ASS: 5,
    SEC_EDC: 6,
    FUN_SAU: 7,
    SEC_ESP: 8,
    SEC_AGR: 9,
    SEC_REC: 10,
    SEC_OBR: 11,
    SEC_GOV: 12,
    CONTROL: 13,
    PROCURA: 14,
    SEC_TUR: 15,
  };

  let url = 'none';

  switch (sector) {
    case SETORES.GAB_CIV:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=662';
      break;
    case SETORES.SEC_ADM:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=663';
      break;
    case SETORES.SEC_FIN:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=664';
      break;
    case SETORES.SEC_ASS:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=665';
      break;
    case SETORES.FUN_ASS:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=674';
      break;
    case SETORES.SEC_EDC:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=666';
      break;
    case SETORES.FUN_SAU:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=667';
      break;
    case SETORES.SEC_ESP:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=668';
      break;
    case SETORES.SEC_AGR:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=669';
      break;
    case SETORES.SEC_REC:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=670';
      break;
    case SETORES.SEC_OBR:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=671';
      break;
    case SETORES.SEC_GOV:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=675';
      break;
    case SETORES.CONTROL:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=676';
      break;
    case SETORES.PROCURA:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=677';
      break;
    case SETORES.SEC_TUR:
      url = '/mudarunidorc.aspx?idUnidadeOrcamentaria=678';
      break;
    default:
      console.log('No such sector');
      break;
  }

  if (url != 'none') await page.goto(INDEX + url);
}

async function downloadFromURL(url, fileName, cookies) {
  console.log("Iniciando download de '" + fileName + "'");

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    headers: {
      Cookie: cookies.map((obj) => obj.name + '=' + obj.value).join(';'),
    },
  });

  const write = fs.createWriteStream(fileName);
  response.data.pipe(write);

  return new Promise((resolve, reject) => {
    write.on('finish', resolve);
    write.on('error', reject);
  });
}

// Essa função corrige o bug onde em algumas RUNs o programa iniciasse
// a etapa de criação de processos com os popups ainda abertos
async function waitFourOrMoreWindows(browser, timeout = 10000) {
  const start_time = Date.now();

  while (Date.now() - start_time < timeout) {
    const pages = await browser.pages();

    if (pages.length >= 4) return pages;

    // Aguardar um intervalo antes de checar novamente
    await new Promise((res) => setTimeout(res, 1000));
  }

  throw Error('ERROR: waitFourOrMoreWindows exceeded ' + timeout + ' ms');
}

module.exports = { downloadFromURL, change_sector, waitFourOrMoreWindows };
