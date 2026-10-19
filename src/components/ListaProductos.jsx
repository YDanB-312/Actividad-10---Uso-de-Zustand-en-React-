// Importamos useEffect y useState para pedir los productos a la API
import { useEffect, useState } from 'react'
// Importamos el hook del store
import { useCarritoStore } from '../store/useCarritoStore'

// Reto 4: los productos ya no vienen de un archivo local, sino de una API.
// Fake Store API devuelve id, title, price (en dólares), image, etc.
const API_URL = 'https://fakestoreapi.com/products'
// Tasa aproximada para mostrar los precios de la API en pesos colombianos
const TASA_CAMBIO = 4000

// Definimos el componente ListaProductos
function ListaProductos() {
  // Del store solo necesitamos la acción para agregar
  const agregarProducto = useCarritoStore((state) => state.agregarProducto)

  // Estado local del catálogo: productos, estado de la petición e intento
  // (el intento sirve para volver a pedir los datos si falla)
  const [productos, setProductos] = useState([])
  const [estado, setEstado] = useState('cargando')
  const [intento, setIntento] = useState(0)

  // Al montar el componente (o al reintentar) pedimos los productos
  useEffect(() => {
    // AbortController cancela la petición si el componente se desmonta
    const controlador = new AbortController()

    async function cargarProductos() {
      setEstado('cargando')
      try {
        // Cancelamos si tarda más de 8 segundos para mostrar el error
        const senal = AbortSignal.any([
          controlador.signal,
          AbortSignal.timeout(8000),
        ])
        const respuesta = await fetch(API_URL, { signal: senal })

        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)

        const datos = await respuesta.json()

        // Adaptamos los nombres de las propiedades a los que usa el carrito
        const adaptados = datos.map((producto) => ({
          id: producto.id,
          nombre: producto.title,
          precio: Math.round(producto.price * TASA_CAMBIO),
          imagen: producto.image,
        }))

        setProductos(adaptados)
        setEstado('listo')
      } catch (error) {
        // Si el error es por desmontar el componente lo ignoramos
        if (error.name === 'AbortError') return
        setEstado('error')
      }
    }

    cargarProductos()

    // Limpieza: al desmontar cancelamos la petición pendiente
    return () => controlador.abort()
  }, [intento])

  // Mientras carga mostramos un mensaje
  if (estado === 'cargando') {
    return (
      <section className="panel">
        <h2>Productos</h2>
        <p className="vacio">Cargando productos...</p>
      </section>
    )
  }

  // Si la API falla, damos la opción de reintentar
  if (estado === 'error') {
    return (
      <section className="panel">
        <h2>Productos</h2>
        <p className="vacio">No se pudieron cargar los productos.</p>
        <button
          className="btn btn-primario btn-bloque"
          onClick={() => setIntento((n) => n + 1)}
        >
          Reintentar
        </button>
      </section>
    )
  }

  return (
    // section agrupa todo el catálogo; panel le da apariencia de tarjeta
    <section className="panel">
      <h2>Productos</h2>

      {/* Recorremos los productos y creamos una fila por cada uno */}
      {productos.map((producto) => (
        // key ayuda a React a identificar cada elemento de la lista
        <div key={producto.id} className="fila">
          {/* Bloque con la imagen, el nombre y el precio */}
          <div className="fila-info">
            <img
              className="fila-imagen"
              src={producto.imagen}
              alt={producto.nombre}
            />
            <div>
              <p className="fila-nombre">{producto.nombre}</p>
              {/* toLocaleString('es-CO') da formato de pesos: 45.000 */}
              <p className="fila-detalle">
                ${producto.precio.toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          {/* Al hacer clic, enviamos el producto completo a la acción del store */}
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
