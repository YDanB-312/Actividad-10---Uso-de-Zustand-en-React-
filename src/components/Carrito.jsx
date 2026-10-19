// Importamos el hook del store
import { useCarritoStore } from '../store/useCarritoStore'

// Definimos el componente Carrito
function Carrito() {
  // Leemos el dato items y las acciones que vamos a usar
  const items = useCarritoStore((state) => state.items)
  const agregarProducto = useCarritoStore((state) => state.agregarProducto)
  const disminuirCantidad = useCarritoStore((state) => state.disminuirCantidad)
  const eliminarProducto = useCarritoStore((state) => state.eliminarProducto)
  const vaciarCarrito = useCarritoStore((state) => state.vaciarCarrito)

  // Calculamos el total: precio por cantidad de cada item, sumado
  const total = items.reduce(
    (suma, item) => suma + item.precio * item.cantidad, // Suma parcial de cada item
    0, // Valor inicial de la suma
  )

  // Si el carrito no tiene items, mostramos un mensaje y terminamos aqui
  if (items.length === 0) {
    return (
      <section className="panel">
        <h2>Carrito</h2>
        <p className="vacio">Tu carrito esta vacio</p>
      </section>
    )
  }

  // Si hay items, mostramos la lista, el total y el boton de vaciar
  return (
    <section className="panel">
      <h2>Carrito</h2>

      {/* Una fila por cada item del carrito */}
      {items.map((item) => (
        <div key={item.id} className="fila">
          <div>
            <p className="fila-nombre">{item.nombre}</p>
            {/* Mostramos la cantidad, el precio unitario y el subtotal
                (reto de extension 2) */}
            <p className="fila-detalle">
              {item.cantidad} x ${item.precio.toLocaleString('es-CO')}
            </p>
            <p className="fila-subtotal">
              Subtotal: ${(item.precio * item.cantidad).toLocaleString('es-CO')}
            </p>
          </div>

          {/* Botones para cambiar la cantidad (reto de extension 1) y para
              eliminar el producto por completo */}
          <div className="fila-acciones">
            <button
              className="btn btn-cantidad"
              onClick={() => disminuirCantidad(item.id)}
              aria-label={`Quitar una unidad de ${item.nombre}`}
            >
              −
            </button>
            <button
              className="btn btn-cantidad"
              onClick={() => agregarProducto(item)}
              aria-label={`Agregar una unidad de ${item.nombre}`}
            >
              +
            </button>
            <button
              className="btn btn-secundario"
              onClick={() => eliminarProducto(item.id)}
            >
              Quitar
            </button>
          </div>
        </div>
      ))}

      {/* Bloque con el total a pagar */}
      <div className="total">
        <span>Total</span>
        <strong>${total.toLocaleString('es-CO')}</strong>
      </div>

      {/* Vacia todo el carrito; no necesita parametros, por eso se pasa la
          referencia directamente */}
      <button className="btn btn-secundario btn-bloque" onClick={vaciarCarrito}>
        Vaciar carrito
      </button>
    </section>
  )
}

// Exportamos el componente
export default Carrito
