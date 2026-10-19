// Script de verificacion y evidencia.
// Abre la tienda en un navegador headless, comprueba el checklist del paso 10
// del PDF y guarda la captura usada en el README.
//
// Uso:
//   1. npm run dev          (en otra terminal)
//   2. npm run captura

import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URL = process.env.URL_TIENDA ?? 'http://localhost:5173'
const SALIDA = resolve(__dirname, '..', 'docs', 'captura-tienda.png')

// Buscamos un navegador instalado en el sistema (no descargamos binarios)
const CANDIDATOS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const comprobaciones = []
function comprobar(descripcion, condicion) {
  comprobaciones.push({ descripcion, ok: Boolean(condicion) })
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${descripcion}`)
}

// Helpers para leer y pulsar elementos desde la pagina
const texto = (page, selector) =>
  page.$eval(selector, (el) => el.textContent.trim())

const contar = (page, selector) =>
  page.$$eval(selector, (els) => els.length)

async function pulsarPorTexto(page, selector, textoBoton) {
  const pulsado = await page.evaluate(
    (sel, objetivo) => {
      const boton = [...document.querySelectorAll(sel)].find(
        (b) => b.textContent.trim() === objetivo,
      )
      if (!boton) return false
      boton.click()
      return true
    },
    selector,
    textoBoton,
  )
  if (!pulsado) throw new Error(`No se encontro el boton "${textoBoton}"`)
}

const main = async () => {
  const nav = await puppeteer.launch({
    executablePath: CANDIDATOS.find((p) => p) ?? undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await nav.newPage()
    await page.setViewport({ width: 1200, height: 900 })

    // Empezamos con el carrito limpio (la persistencia guarda en localStorage)
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'domcontentloaded' })

    // Esperamos a que se dibuje el catalogo
    await page.waitForSelector('.panel .fila')
    // Esperamos a que termine la carga del catalogo (API o respaldo local)
    await page
      .waitForFunction(
        () => !document.querySelector('.nota')?.textContent.includes('Cargando'),
        { timeout: 15000 },
      )
      .catch(() => {})
    const filasCatalogo = await contar(page, '.panel:first-of-type .fila')
    comprobar('El catalogo muestra productos', filasCatalogo > 0)
    // Esperamos a que la primera imagen del catalogo termine de cargar
    await page
      .waitForFunction(
        () => {
          const img = document.querySelector('.fila-imagen')
          return !img || img.complete
        },
        { timeout: 10000 },
      )
      .catch(() => {})

    // 1. Carrito vacio e insignia en 0
    comprobar(
      'Al cargar, el carrito dice "Tu carrito esta vacio"',
      (await page.$eval('body', (b) => b.textContent)).includes(
        'Tu carrito esta vacio',
      ),
    )
    comprobar('La insignia arranca en 0', (await texto(page, '.insignia')).startsWith('0'))

    // 2. Agregar una Camiseta y ver la insignia
    await pulsarPorTexto(page, '.panel:first-of-type .btn-primario', 'Agregar')
    comprobar('Al agregar un producto la insignia sube a 1', (await texto(page, '.insignia')).startsWith('1'))
    comprobar('El producto aparece en el carrito', (await contar(page, '.panel:last-of-type .fila')) === 1)

    // 3. Agregar otra vez el mismo producto: no se duplica la fila
    await pulsarPorTexto(page, '.panel:first-of-type .btn-primario', 'Agregar')
    comprobar(
      'Al repetir el producto no se duplica la fila',
      (await contar(page, '.panel:last-of-type .fila')) === 1,
    )
    comprobar(
      'La cantidad pasa a 2',
      (await page.$eval('.panel:last-of-type .fila-detalle', (el) => el.textContent)).includes('2 x'),
    )

    // 4. Subtotal por producto (reto 2)
    comprobar(
      'La fila del carrito muestra el subtotal',
      (await contar(page, '.fila-subtotal')) === 1,
    )

    // 5. El boton "−" disminuye la cantidad (reto 1)
    await pulsarPorTexto(page, '.panel:last-of-type .btn-cantidad', '−')
    comprobar(
      'El boton "−" baja la cantidad a 1',
      (await page.$eval('.panel:last-of-type .fila-detalle', (el) => el.textContent)).includes('1 x'),
    )

    // 6. El boton Quitar elimina el producto
    await pulsarPorTexto(page, '.panel:last-of-type .btn-secundario', 'Quitar')
    comprobar('El boton Quitar elimina el producto', (await contar(page, '.panel:last-of-type .fila')) === 0)

    // Dejamos el carrito con productos para la captura
    const agregar = '.panel:first-of-type .btn-primario'
    for (const indice of [0, 0, 1, 2]) {
      await page.$$eval(
        agregar,
        (botones, i) => botones[i].click(),
        indice,
      )
    }
    comprobar(
      'La insignia refleja el total de unidades (4)',
      (await texto(page, '.insignia')).startsWith('4'),
    )

    // Captura de evidencia
    await mkdir(dirname(SALIDA), { recursive: true })
    await page.screenshot({ path: SALIDA, fullPage: true })
    console.log(`\nCaptura guardada en ${SALIDA}`)

    // 7. Vaciar carrito
    await pulsarPorTexto(page, '.panel:last-of-type .btn-bloque', 'Vaciar carrito')
    comprobar('Vaciar deja la insignia en 0', (await texto(page, '.insignia')).startsWith('0'))
    comprobar(
      'Vaciar muestra el mensaje de carrito vacio',
      (await page.$eval('body', (b) => b.textContent)).includes('Tu carrito esta vacio'),
    )

    const fallos = comprobaciones.filter((c) => !c.ok)
    console.log(
      `\n${comprobaciones.length - fallos.length}/${comprobaciones.length} comprobaciones correctas`,
    )
    if (fallos.length > 0) process.exitCode = 1
  } finally {
    await nav.close()
  }
}

main().catch((error) => {
  console.error('Error en la verificacion:', error.message)
  process.exitCode = 1
})
