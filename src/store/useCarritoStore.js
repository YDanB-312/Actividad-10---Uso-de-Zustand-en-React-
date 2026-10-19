// Importamos la función create, que construye un store de Zustand
import { create } from 'zustand'
// Reto 3: middleware persist para que el carrito no se pierda al recargar
import { persist } from 'zustand/middleware'

// create recibe una función que devuelve el estado inicial y las acciones
// set es la función que Zustand nos da para modificar el estado
// El resultado es un hook personalizado que exportamos para usarlo en los componentes
export const useCarritoStore = create(
  persist(
    (set) => ({
      // ===== ESTADO =====
      // items guarda los productos del carrito; al iniciar está vacío
      items: [],

      // ===== ACCIONES =====

      // Agrega un producto al carrito; recibe el objeto producto completo
      agregarProducto: (producto) =>
        // set recibe el estado actual (state) y devuelve lo que cambia
        set((state) => {
          // Buscamos si el producto ya está en el carrito comparando por id
          const existe = state.items.find((item) => item.id === producto.id)

          // Si el producto ya existe, solo aumentamos su cantidad
          if (existe) {
            return {
              // Recorremos los items y creamos un arreglo nuevo (nunca modificamos el original)
              items: state.items.map((item) =>
                item.id === producto.id
                  ? { ...item, cantidad: item.cantidad + 1 } // Copia del item con cantidad + 1
                  : item, // Los demás items quedan igual
              ),
            }
          }

          // Si no existe, lo agregamos al final con cantidad 1
          return { items: [...state.items, { ...producto, cantidad: 1 }] }
        }),

      // Reto 1: resta una unidad. Si la cantidad llega a 0, el producto sale
      // del carrito.
      disminuirCantidad: (id) =>
        set((state) => {
          const item = state.items.find((i) => i.id === id)

          // Si el item no existe no hay nada que cambiar
          if (!item) return {}

          // Si solo queda una unidad, lo sacamos del carrito
          if (item.cantidad <= 1) {
            return { items: state.items.filter((i) => i.id !== id) }
          }

          // Si hay más de una unidad, creamos un arreglo nuevo restando 1
          return {
            items: state.items.map((i) =>
              i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i,
            ),
          }
        }),

      // Elimina un producto del carrito usando su id
      eliminarProducto: (id) =>
        set((state) => ({
          // filter deja todos los items excepto el que tiene ese id
          items: state.items.filter((item) => item.id !== id),
        })),

      // Vacía el carrito por completo; no necesita el estado anterior
      vaciarCarrito: () => set({ items: [] }),
    }),
    {
      // Nombre con el que se guarda el carrito en localStorage
      name: 'carrito-zustand',
    },
  ),
) // Fin del store
