// Solicitação

async function licitada(page, number, year) {
  if (typeof number !== 'number' || typeof year !== 'number')
    throw new TypeError('FUNCTION LICITADA: TYPE ERROR');

  await page.$eval('#tabLicitacao', (tabLicitacao) => {
    tabLicitacao.querySelectorAll('td')[2].querySelector('a').click();
  });

  await page.waitForNavigation();

  await page.type('#txtLicitacao', String(number));
  await page.type('#txtLicitacaoExercicio', String(year));

  await page.evaluate(() => {
    LerLicitacao();
  });

  await page.waitForNavigation();
}

async function add_item(page, id, quantity) {
  if (typeof id !== 'number' || typeof quantity !== 'number')
    throw new TypeError('FUNCTION ADD_ITEM: TYPE ERROR');

  const result = await page.evaluate((item_id) => {
    const items = document.querySelectorAll('.GridItem, .GridAltItem');

    for (const item of items) {
      const item_desc = item.querySelector('span').innerText;
      if (item_desc.includes(item_id)) var item_has_stock = item;
    }

    if (item_has_stock) {
      item_has_stock.querySelector('input').click();
      return 0;
    }

    return -1;
  }, id);

  if (result < 0) {
    console.log('WARNING: ' + id + ' out of stock');
    return -1;
  }

  await page.waitForNavigation();

  const stock = await page.evaluate(() => {
    return Number(
      $('#dgLicitacaoItens__ctl1_txtSaldo').val().replace(',', '.')
    );
  });

  if (quantity > stock) {
    quantity = stock;
    console.log('WARNING: ' + id + ' set to stock value');
  }

  await page.type('#dgLicitacaoItens__ctl1_txtQuantidade', String(quantity));
  await page.click('#dgLicitacaoItens__ctl1_imgLancar');

  await page.waitForNavigation();
}

async function solicitacao(page, info) {
  await page.goto(INDEX + '/licitacaosolicitacao.aspx');

  // Se o tipo da licitação for 'licitada'
  await licitada(page, info.licitacao.numero, info.licitacao.ano);

  for (const item of info.itens) await add_item(page, item.id, item.qtd);
}

async function copy_solicitacao(page, sol_num) {
  await page.goto(INDEX + '/licitacaosolicitacao.aspx');

  await page.type('#txtNumero', String(sol_num));
  await page.click('#btnBuscar');

  await page.waitForNavigation();

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

  await solicitacao(page, info);
}

module.exports = { solicitacao, copy_solicitacao };
