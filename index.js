const puppeteer = require('puppeteer');
const dotenv = require('dotenv').config();
const fs = require('fs');

const INDEX = process.env.MYADDR;

/*
async downloadFromURL() {
	// TODO
}
*/

async function funcOrdemCS(page, info) {
  await page.goto(INDEX + '/mudarunidorc.aspx?idUnidadeOrcamentaria=' +
    info.unidadeOrcamentaria);

  await page.goto(INDEX + "/ordemcs.aspx");

  await page.$eval('#txtDataEmissao', (el, data) => el.value = data, info.data);
  await page.$eval('#txtCodOrgao', (el, org) => el.value = org, info.codOrgao);
  await page.$eval('#txtCodUnidade', (el, uni) => el.value = uni, info.codUnidade);
  await page.$eval('#txtLicitacao', (el, num) => el.value = num, info.licitacao.numero);

  await page.$eval('#txtLicitacaoExercicio', (el, ano) => {
    el.value = ano;
    LerLicitacao();
  }, info.licitacao.ano);
  await page.waitForNavigation();

  if (!await page.$eval('#txtNomeCredor', el => el.value))
    throw new Error('Invalid \'Licitacao\'');

  // change to "observação" tab
  await page.waitForSelector('#Tabstrip2');
  await page.evaluate(() => {
    document.Form1.__Tabstrip2_State__.value = '2';
    __doPostBack('Tabstrip2', '2');
  });
  await page.waitForNavigation();

  await page.$eval('#txtObservacao', (el, jus) => el.value = jus, info.justificativa);

  // change to "itens" tab
  await page.waitForSelector('#Tabstrip2');
  await page.evaluate(() => {
    document.Form1.__Tabstrip2_State__.value = '1';
    __doPostBack('Tabstrip2', '1');
  });
  await page.waitForNavigation();

  // setup the itens of the "ordem"
  for (const item of info.itens) {
    // item to be added
    await page.$eval('#dgItens__ctl1_txtCodItem', (el, itemID) => {
      el.value = itemID;
      HabilitarItem();
    }, item.codigo);
    await page.waitForNavigation();

    if (!await page.$eval('#dgItens__ctl1_txtItem', el => el.value))
      throw new Error('Invalid \'Item\': ' + item.codigo);

    // amount of item to be add
    await page.$eval('#dgItens__ctl1_txtQuantidade', (el, qtd) => {
      el.value = qtd;
    }, item.quantidade);

    await page.click('#dgItens__ctl1_imgLancar');
    await page.waitForNavigation();
  }

  const valor_total = await page.$eval('#txtTotalItens', el => el.value);

  // change to "dados gerais" tab
  await page.waitForSelector('#Tabstrip2');
  await page.evaluate(() => {
    document.Form1.__Tabstrip2_State__.value = '0';
    __doPostBack('Tabstrip2', '0');
  });
  await page.waitForNavigation();

  await page.$eval('#txtObjeto', (el, obj) => el.value = obj, info.objeto);
  await page.$eval('#txtValor', (el, vlr) => el.value = vlr, valor_total);

  await page.waitForSelector('#btnGravar');
  await page.click('#btnGravar');

  return valor_total;
}

async function funcEmpenho(page, info) {
  await page.goto(INDEX + '/mudarunidorc.aspx?idUnidadeOrcamentaria=' +
    info.unidadeOrcamentaria);

  await page.goto(INDEX + "/notaempenho.aspx");

  await page.$eval("#txtDataEmissao", (el, data) => el.value = data, info.data);

  await page.$eval("#txtOrdemCS", (el, numero) => el.value = numero, info.ordem.numero);
  await page.$eval("#txtOrdemCSExercicio", (el, ano) => {
    el.value = ano;
    lerOrdemCS();
  }, info.ordem.ano);
  await page.waitForNavigation();

  await page.$eval("#txtCodAcao", (el, acao) => el.value = acao, info.empenho.acao);
  await page.$eval("#txtCodNatDespesa", (el, natureza) => el.value = natureza, info.empenho
  .naturezaDespesa);
  await page.$eval("#txtCodFonteRecurso", (el, fonte) => el.value = fonte, info.empenho.fonteRecurso);
  await page.$eval("#txtCodSubelemento", (el, subEL) => el.value = subEL, info.empenho.subElemento);
  await page.$eval("#txtValorEmpenho", (el, valor) => el.value = valor, info.valor);
  await page.$eval("#txtJustificativa", (el, justificativa) => el.value = justificativa, info
  .justificativa);

  await page.$eval("#txtCodRegiao", el => el.value = "0001");
  await page.$eval("#ddlEspecie", (el, especie) => {
    el.options.selectedIndex = especie;
    __doPostBack('ddlEspecie', '');
  }, info.empenho.especie);
  await page.waitForNavigation();

  // change to "ordem cronologica" tab
  await page.waitForSelector('#Tabstrip1');
  await page.evaluate(() => {
    document.Form1.__Tabstrip1_State__.value = '6';
    __doPostBack('Tabstrip1', '6');
  });
  await page.waitForNavigation();

  await page.$eval("#chkDesobrigacaoOrdemCronologicaPag", (el, isCheck) => {
    el.checked = isCheck;
  }, info.empenho.ordemCronologica.desobrigado);
  await page.$eval("#ddlDesobrigacaoOrdemCronologicaPagJustificativa", (el, justificativa) => {
    el.options.selectedIndex = justificativa;
  }, info.empenho.ordemCronologica.justificativa);

  // change to "natureza rendimento" tab
  await page.waitForSelector('#Tabstrip1');
  await page.evaluate(() => {
    document.Form1.__Tabstrip1_State__.value = '8';
    __doPostBack('Tabstrip1', '8');
  });
  await page.waitForNavigation();

  await page.$eval("#txtCodNatRend", (el, natRend) => el.value = natRend, info.empenho.naturezaRendimento);
  await page.$eval("#ddlCategoriaContrato", (el, categoria) => {
    el.options.selectedIndex = categoria;
  }, info.empenho.categoria);

  await page.waitForSelector('#btnGravar');
  await page.click('#btnGravar');
}

async function pdfWindowHandler(browser) {
  const target = await browser.waitForTarget(win => win.url().includes('/report.aspx'));
  const page = await target.page();

  // if url is from ordemcs.aspx pdf return ordemcs 'numero' and 'ano'
  // this mean to be used with notaempenho.aspx
  var ocinfo;
  const param = page.url().match(/param=.+?&/);

  if (page.url().includes('rpt=ordemcs'))
    ocinfo = param[0].match(/([0-9]+?)\|\1\|([0-9]{4})/);

  if (page.url().includes('rpt=NotaEmpenho'))
    ocinfo = param[0].match(/([0-9]{4}).+?([0-9]+?)&/);

  await page.close();
  return [ocinfo[1], ocinfo[2]];
}

// main function here
(async () => {
  const browser = await puppeteer.launch( /*{headless: false}*/ );
  const page = await browser.newPage();
  await page.goto(INDEX + '/logon.aspx');

  // set login user and password
  await page.type('#txtUsuario', process.env.MYUSER);
  await page.type('#txtSenha', process.env.MYPASS);
  await page.$eval('#btnEntrar', el => el.click());
  await page.waitForNavigation();
  console.log("logged!");

  const pages = await browser.pages();
  for (const popup of pages) {
    if (!popup.url().includes('/painel.aspx'))
      await popup.close();
  }

  // treating dialogs for get only the one that
  // interrupt the flow of the process emission
  await page.on('dialog', async dialog => {
    const message = await dialog.message();
    switch (true) {
      case message.includes('Valor do Empenho maior que saldo orcamentário'):
        throw new Error(dialog.message());
        break;
      default:
        await dialog.accept();
    }
  });

  // steps to make the process
  var info = await JSON.parse(fs.readFileSync('test.json'));
  for (let i = 0; i < info.length; ++i) {
    // example
    const oc_valor = await funcOrdemCS(page, info[i]);
    const [oc_numero, oc_ano] = await pdfWindowHandler(browser);

    if (oc_valor != null && oc_numero != null && oc_ano != null) {
      info[i] = {
        ...info[i],
        "valor": oc_valor
      };
      info[i] = {
        ...info[i],
        "ordem": {
          "numero": oc_numero,
          "ano": oc_ano
        }
      };
    }

    await funcEmpenho(page, info[i]);
    const [emp_ano, emp_numero] = await pdfWindowHandler(browser);

    console.log('Ordem: ' + oc_numero + '/' + oc_ano + ' finished!');
    console.log('Empenho: ' + emp_numero + '/' + emp_ano + ' finished!');

    console.log('finished [' + (i + 1) + '] of ' + info.length);
  }

  await browser.close();
})();
