// Solicitação

/*
 * Exemplo de JSON para uma solicitação.
 * {
 *   data: '01/01/2024',
 *   objeto: 'COMPRA DE ITEM',
 *   justificativa: 'ESSE ITEM É ESSENCIAL',
 *   licitacao: {
 *     numero: 10,
 *     ano: 2077,
 *    },
 *    itens: [
 *      { id: 12345, qtd: 5 },
 *      { id: 12346, qtd: 7 }
 *    ],
 *   }
 *
 */

/**
 * Representa as inforamções de uma licitação.
 * @typedef {object} LicitacaoInfo
 * @property {number} numero - Indica o número da licitação.
 * @property {number} ano - Indica o ano da licitação.
 */

/**
 * Representa um objeto com id e quantidade de um item da solicitação.
 * @typedef {object} ItemSolicitacao
 * @property {number} id - Indica o id do item.
 * @property {number} qtd - Indica a quantidade do item.
 */

/**
 * Representa as inforamções de uma solicitação.
 * @typedef {object} ObjetoDeSolicitacao
 * @property {string} data - Indica a data da solicitação.
 * @property {string} objeto - Indica o texto do campo Objeto.
 * @property {string} justificativa - Indica o texto do campo Justificativa.
 * @property {LicitacaoInfo} licitacao - Indica informações sobre a licitação.
 * @property {ItemSolicitacao[]} itens - Indica um array de itens da solicitação.
 */

/**
 * Função responsável por selecionar o tipo da solicitação a ser criada como licitada.
 *
 * @param {object} page - Objeto Puppeteer representando a página de automação.
 * @param {number} number - Número da solicitação.
 * @param {number} year - Ano da solicitação.
 */
async function licitada(page, number, year) {
  if (typeof number !== 'number' || typeof year !== 'number')
    throw new TypeError('FUNCTION LICITADA: TYPE ERROR');

  await page.waitForSelector('#tabLicitacao');
  await page.$eval('#tabLicitacao', (tabLicitacao) => {
    tabLicitacao.querySelectorAll('td')[2].querySelector('a').click();
  });

  await page.waitForNavigation();

  await page.waitForSelector('#txtLicitacao');
  await page.type('#txtLicitacao', String(number));

  await page.waitForSelector('#txtLicitacaoExercicio');
  await page.type('#txtLicitacaoExercicio', String(year));

  await page.evaluate(() => {
    LerLicitacao();
  });

  await page.waitForNavigation({ timeout: 10000 });
}

/**
 * Função responsável por adicionar itens a solicitação. Pesquisa pelo item entre
 * a lista de todos os itens da licitação e adiciona a quantidade especificada.
 *
 * @param {object} page - Objeto Puppeteer representando a página de automação.
 * @param {number} id - Id do item para ser adicionado.
 * @param {number} amount - Quantidade do item para ser adicionado.
 */
async function adicionar_item(page, id, amount) {
  if (typeof id !== 'number' || typeof amount !== 'number')
    throw new TypeError('FUNCTION ADD_ITEM: TYPE ERROR');

  // Busca pelo item pelo id e clica no botão de editar, se encontrado
  await page.waitForSelector('#dgLicitacaoItens');
  const click_edit_result = await page.evaluate((item_id) => {
    const items = document.querySelectorAll('.GridItem, .GridAltItem');

    for (const item of items) {
      // Verifica o id na descrição do item
      if (item.querySelector('span').innerText.includes(item_id)) {
        item.querySelector('input').click();
        return 0;
      }
    }

    return -1; // Retorna -1 se o item não foi encontrado
  }, id);

  if (click_edit_result < 0) {
    console.log('WARNING: Item de id: ' + id + ' sem saldo');
    return -1;
  }

  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Obtém o saldo atual do item e converte para número
  await page.waitForSelector('#dgLicitacaoItens__ctl1_txtSaldo');
  const stock = await page.evaluate(() =>
    Number($('#dgLicitacaoItens__ctl1_txtSaldo').val().replace(',', '.'))
  );

  // Ajusta quantidade para o saldo restante, se necessário
  if (amount > stock) {
    amount = stock;
    console.log('WARNING: Item de id: ' + id + ' ajustado para saldo restante');
  }

  // Define a quantidade desejada e adiciona o item à solicitação
  await page.waitForSelector('#dgLicitacaoItens__ctl1_txtQuantidade');
  await page.type('#dgLicitacaoItens__ctl1_txtQuantidade', String(amount));

  await page.waitForSelector('#dgLicitacaoItens__ctl1_imgLancar');
  await page.click('#dgLicitacaoItens__ctl1_imgLancar');

  // Algumas vezes o item não é adicionado e cai em um timeout indefinitivo
  try {
    await page.waitForNavigation({ timeout: 10000 });
  } catch (error) {
    console.log('WARNING: Falha ao adicionar item de id:', id);
  }
}

/**
 * Função responsável pela configuração do ambiente de "Solicitação".
 *
 * @param {object} page - Objeto Puppeteer representando a página de automação.
 * @param {ObjetoDeSolicitacao} info - Objeto com as informações da solicitação.
 */
async function criar_solicitacao(page, info) {
  await page.goto(INDEX + '/licitacaosolicitacao.aspx');

  await page.waitForSelector('#txtDataEmissao');
  await page.type('#txtDataEmissao', String(info.data));

  // TODO: Adicionar novos tipos de solicitação

  await licitada(page, info.licitacao.numero, info.licitacao.ano); // tipo

  // Objeto e Justificativa para a solicitação deve ser configurado após especificado
  // o tipo da solicitação, porque quando o site puxa os itens da licitação esses
  // dois campos são alterados automaticamente
  await page.evaluate(
    (objeto, justificativa) => {
      document.getElementById('txtObjeto').value = objeto;
      document.getElementById('txtJustificativa').value = justificativa;
    },
    info.objeto,
    info.justificativa
  );

  for (const item of info.itens) await adicionar_item(page, item.id, item.qtd);
}

/**
 * Função responsável por duplicar uma solicitação específica.
 * Navega até a página, busca pelo número da solicitação, extrai itens utilizados,
 * e chama a função para criar uma nova solicitação com as informações copiadas.
 *
 * @param {object} page - Objeto Puppeteer representando a página de automação.
 * @param {number} snumber - Número da solicitação a ser buscada e copiada.
 */
async function duplicar_solicitacao(page, snumber) {
  await page.goto(INDEX + '/licitacaosolicitacao.aspx');

  await page.waitForSelector('#txtNumero');
  await page.type('#txtNumero', String(snumber));

  await page.waitForSelector('#btnBuscar');
  await page.click('#btnBuscar');

  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Ler todos os itens com 'font-weight: bold' de uma solicitação existente e
  // extrai a quantidade e o id para um array de object a ser retornado
  await page.waitForSelector('#dgLicitacaoItens');
  const info = await page.evaluate(() => {
    let sdata = document
      .getElementById('txtDataEmissao')
      .value.replace(/[\/]/g, '');

    let sobjeto = document.getElementById('txtObjeto').value;
    let sjustificativa = document.getElementById('txtJustificativa').value;

    let licitacao_num = Number(document.getElementById('txtLicitacao').value);
    let licitacao_ano = Number(document.getElementById('txtLicitacaoExercicio').value); // prettier-ignore

    let items_array = [];

    document.querySelectorAll('.GridItem, .GridAltItem').forEach((elem) => {
      if (elem.style.fontWeight == 'bold')
        items_array.push({
          // Adiciona um objeto com { id: <id>, qtd: <qtd> } para o array
          id: Number(
            elem
              .querySelector('span')
              .innerText.match('[0-9]{7}')[0]
              .replace(/^0+(?=[1-9])/, '')
          ),
          qtd: Number(
            elem
              .querySelectorAll('td')[2]
              .innerText.replace('.', '')
              .replace(',', '.')
          ),
        });
    });

    return {
      data: sdata,
      objeto: sobjeto,
      justificativa: sjustificativa,
      licitacao: {
        numero: licitacao_num,
        ano: licitacao_ano,
      },
      itens: items_array,
    };
  });

  // chama a função solicitacao para criar um copia da solicitacao atual
  await criar_solicitacao(page, info);
}

// ainda não decidi se o nome das funções serão em ingles ou em português

module.exports = { criar_solicitacao, duplicar_solicitacao };
