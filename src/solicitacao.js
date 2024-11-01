// Solicitação

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

  await page.waitForNavigation();
}

async function adicionar_item(page, id, amount) {
  if (typeof id !== 'number' || typeof amount !== 'number')
    throw new TypeError('FUNCTION ADD_ITEM: TYPE ERROR');

  // Percorre a lista de itens e compara a descrição contém o valor do id
  await page.waitForSelector('#dgLicitacaoItens');
  const click_edit_result = await page.evaluate((item_id) => {
    const items = document.querySelectorAll('.GridItem, .GridAltItem');

    for (const item of items) {
      const item_desc = item.querySelector('span').innerText;

      // Caso a descrição contenha o id então clique no botão de editar (add) item
      if (item_desc.includes(item_id)) {
        item.querySelector('input').click();
        return 0;
      }
    }

    return -1;
  }, id);

  if (click_edit_result < 0) {
    console.log('WARNING: Item de id: ' + id + ' sem saldo');
    return -1;
  }
  console.log('clicou edit');

  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  await page.waitForSelector('#dgLicitacaoItens__ctl1_txtSaldo');
  const stock = await page.evaluate(() =>
    Number($('#dgLicitacaoItens__ctl1_txtSaldo').val().replace(',', '.'))
  );

  if (amount > stock) {
    amount = stock;
    console.log('WARNING: Item de id: ' + id + ' ajustado para saldo restante');
  }

  console.log('setou stock');
  // Após o item estar pronto para ser editado, configura o campo "Qtd." para o valor desejado
  await page.waitForSelector('#dgLicitacaoItens__ctl1_txtQuantidade');
  await page.type('#dgLicitacaoItens__ctl1_txtQuantidade', String(amount));
  console.log('setou qtd');

  await page.waitForSelector('#dgLicitacaoItens__ctl1_imgLancar');
  await page.click('#dgLicitacaoItens__ctl1_imgLancar');
  console.log('clicou gravar');

  await page.waitForNavigation();

  console.log('finalizou id ' + id);
}

// Essa função é responsável pela configuração do ambiente de "Solicitação"
// TODO: implementar novos tipos de licitação além do 'licitada'
async function criar_solicitacao(page, info) {
  await page.goto(INDEX + '/licitacaosolicitacao.aspx');

  // Se o tipo da licitação for "Licitada"
  // isso pode se tornar um if futuramente caso haja mais tipos de licitação implementados
  await licitada(page, info.licitacao.numero, info.licitacao.ano);

  for (const item of info.itens) await adicionar_item(page, item.id, item.qtd);
}

async function copiar_solicitacao(page, sol_num) {
  await page.goto(INDEX + '/licitacaosolicitacao.aspx');

  await page.waitForSelector('#txtNumero');
  await page.type('#txtNumero', String(sol_num));

  await page.waitForSelector('#btnBuscar');
  await page.click('#btnBuscar');

  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Ler todos os itens com 'font-weight: bold' de uma solicitação existente e
  // extrai a quantidade e o id para um array de object a ser retornado
  await page.waitForSelector('#dgLicitacaoItens');
  const info = await page.evaluate(() => {
    let licitacao_num = Number(document.getElementById('txtLicitacao').value);
    let licitacao_ano = Number(
      document.getElementById('txtLicitacaoExercicio').value
    );

    let items_array = [];

    document.querySelectorAll('.GridItem, .GridAltItem').forEach((elem) => {
      if (elem.style.fontWeight == 'bold')
        items_array.push({
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
      licitacao: {
        numero: licitacao_num,
        ano: licitacao_ano,
      },
      itens: items_array,
    };
  });

  // chama a função solicitacao para criar um copia da solicitacao atual
  console.log(info.itens.length);
  await criar_solicitacao(page, info);
}

// ainda não decidi se o nome das funções serão em ingles ou em português

module.exports = { criar_solicitacao, copiar_solicitacao };
