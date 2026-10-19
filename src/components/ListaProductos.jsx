// Importamos useEffect y useState para pedir los productos a una API
import { useEffect, useState } from 'react'
// Importamos el arreglo local de productos (respaldo si la API falla)
import { productos as productosLocales } from '../data/productos'
// Importamos el hook del store
import { useCarritoStore } from '../store/useCarritoStore'

// Reto de extension 4: los productos vienen de una API publica.
// Fake Store API devuelve id, title, price (en dolares), image, etc.
const API_URL = 'https://fakestoreapi.com/products'
// Tasa aproximada para mostrar los precios de la API en pesos colombianos
const TASA_CAMBIO = 4000
// La API devuelve 20 productos; mostramos solo unos pocos para que el
// catalogo de la demostracion sea comodo de leer. Cambia este numero
// (o quitalo) para verlos todos.
const PRODUCTOS_VISIBLES = 8

// Definimos el componente ListaProductos
function ListaProductos() {
  // Del store solo necesitamos la accion para agregar
  const agregarProducto = useCarritoStore((state) => state.agregarProducto)

  // Estado local: catalogo, origen de los datos y mensaje de carga
  const [productos, setProductos] = useState(productosLocales)
  const [origen, setOrigen] = useState('cargando')

  // Al montar el componente pedimos los productos a la API
  useEffect(() => {
    // AbortController cancela la peticion si el componente se desmonta
    const controlador = new AbortController()

    async function cargarProductos() {
      try {
        // Cancelamos la peticion si tarda mas de 8 segundos para caer al
        // catalogo local en lugar de quedarnos cargando para siempre
        const senal = AbortSignal.any([
          controlador.signal,
          AbortSignal.timeout(8000),
        ])
        const respuesta = await fetch(API_URL, { signal: senal })

        // Si la respuesta no es 200 lanzamos un error para usar el respaldo
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)

        const datos = await respuesta.json()

        // Adaptamos los nombres de las propiedades a los que usa el carrito
        const adaptados = datos.map((producto) => ({
          id: producto.id,
          nombre: producto.title,
          precio: Math.round(producto.price * TASA_CAMBIO),
          imagen: producto.image,
        }))

        setProductos(adaptados.slice(0, PRODUCTOS_VISIBLES))
        setOrigen('api')
      } catch (error) {
        // Si el error es por desmontar el componente lo ignoramos
        if (error.name === 'AbortError') return
        // Si la API falla mostramos el catalogo local
        setProductos(productosLocales)
        setOrigen('local')
      }
    }

    cargarProductos()

    // Limpieza: al desmontar cancelamos la peticion pendiente
    return () => controlador.abort()
  }, [])

  return (
    // section agrupa todo el catalogo; panel le da apariencia de tarjeta
    <section className="panel">
      <h2>Productos</h2>

      {/* Aviso del origen del catalogo */}
      <p className="nota">
        {origen === 'cargando' && 'Cargando catalogo...'}
        {origen === 'api' &&
          `Catalogo cargado desde Fake Store API (primeros ${PRODUCTOS_VISIBLES} productos)`}
        {origen === 'local' &&
          'No se pudo conectar con la API: mostrando catalogo local'}
      </p>

      {/* Recorremos los productos y creamos una fila por cada uno */}
      {productos.map((producto) => (
        // key ayuda a React a identificar cada elemento de la lista
        <div key={producto.id} className="fila">
          {/* Bloque con la imagen, el nombre y el precio */}
          <div className="fila-info">
            {producto.imagen && (
              <img
                className="fila-imagen"
                src={producto.imagen}
                alt={producto.nombre}
              />
            )}
            <div>
              <p className="fila-nombre">{producto.nombre}</p>
              {/* toLocaleString('es-CO') da formato de pesos: 45.000 */}
              <p className="fila-detalle">
                ${producto.precio.toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          {/* Al hacer clic, enviamos el producto completo a la accion del
              store. El () => es obligatorio para que la accion se ejecute al
              hacer clic y no al dibujar la pagina. */}
          <button
            className="btn btn-primario"
            onClick={() => agregarProducto(producto)}
          >
            Agregar
          </button>
        </div>
      ))}
    </section>
  )
}

// Exportamos el componente
export default ListaProductos
