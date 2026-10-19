// Script de verificación y evidencia.
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

// Helpers para leer y pulsar elementos desde la página
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
  if (!pulsado) throw new Error(`No se encontró el botón "${textoBoton}"`)
}

const main = async () => {
  const nav = await puppeteer.launch({
    executablePath: CANDIDATOS.find((p) => p) ?? undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await nav.newPage()
    await page.setViewport({ width: 1200, height: 800 })

    // Empezamos con el carrito limpio
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'domcontentloaded' })

    // Esperamos a que se dibuje el catálogo
    await page.waitForSelector('.panel .fila')
    const filasCatalogo = await contar(page, '.panel:first-of-type .fila')
    comprobar('El catálogo muestra los 4 productos', filasCatalogo === 4)

    // 1. Carrito vacío e insignia en 0
    comprobar(
      'Al cargar, el carrito dice "Tu carrito está vacío"',
      (await page.$eval('body', (b) => b.textContent)).includes(
        'Tu carrito está vacío',
      ),
    )
    comprobar('La insignia arranca en 0', (await texto(page, '.insignia')) === '0')

    // 2. Agregar una Camiseta y ver la insignia
    await pulsarPorTexto(page, '.panel:first-of-type .btn-primario', 'Agregar')
    comprobar('Al agregar un producto la insignia sube a 1', (await texto(page, '.insignia')) === '1')
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

    // 4. El total se recalcula (2 x 45.000 = 90.000)
    comprobar(
      'El total se recalcula con cada producto agregado',
      (await texto(page, '.panel:last-of-type .total strong')) === '$90.000',
    )

    // 5. El botón Quitar elimina solo ese producto
    await pulsarPorTexto(page, '.panel:last-of-type .btn-secundario', 'Quitar')
    comprobar('El botón Quitar elimina el producto', (await contar(page, '.panel:last-of-type .fila')) === 0)

    // Dejamos el carrito con productos para la captura
    const agregar = '.panel:first-of-type .btn-primario'
    for (const indice of [0, 0, 1, 2]) {
      await page.$$eval(agregar, (botones, i) => botones[i].click(), indice)
    }
    comprobar(
      'El total refleja 4 unidades (90.000 + 30.000 + 180.000 = 300.000)',
      (await texto(page, '.panel:last-of-type .total strong')) === '$300.000',
    )

    // Captura de evidencia
    await mkdir(dirname(SALIDA), { recursive: true })
    await page.screenshot({ path: SALIDA, fullPage: true })
    console.log(`\nCaptura guardada en ${SALIDA}`)

    // 6. Vaciar carrito
    await pulsarPorTexto(page, '.panel:last-of-type .btn-bloque', 'Vaciar carrito')
    comprobar('Vaciar deja la insignia en 0', (await texto(page, '.insignia')) === '0')
    comprobar(
      'Vaciar muestra el mensaje de carrito vacío',
      (await page.$eval('body', (b) => b.textContent)).includes(
        'Tu carrito está vacío',
      ),
    )

    // 7. Responsive: los paneles se apilan en pantalla angosta
    await page.setViewport({ width: 420, height: 800 })
    const apilados = await page.evaluate(() => {
      const [catalogo, carrito] = document.querySelectorAll('.panel')
      const a = catalogo.getBoundingClientRect()
      const b = carrito.getBoundingClientRect()
      return b.top >= a.bottom - 1
    })
    comprobar(
      'En pantalla angosta los paneles se apilan uno debajo del otro',
      apilados,
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
  console.error('Error en la verificación:', error.message)
  process.exitCode = 1
})
