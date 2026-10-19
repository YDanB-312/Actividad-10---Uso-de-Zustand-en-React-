# Mi Tienda — Carrito de compras con React y Zustand

Practica del programa **Analisis y Desarrollo de Software (SENA)**.
Guia: _Carrito de compras con React y Zustand_ — Instructor Juan Pablo Chamizzo Vega.

App de tienda con un carrito de compras cuyo estado se comparte entre
componentes usando **Zustand**, sin pasar props ni usar Providers.

![Tienda funcionando con productos en el carrito](docs/captura-tienda.png)

## Resultado de aprendizaje

Implementar un estado global en una aplicacion React con la libreria Zustand,
separando datos, logica y vista.

## Requisitos

- Node.js 18 o superior
- npm
- Conocer componentes, props, `useState` y el metodo `map` de los arreglos

## Como ejecutarlo

```bash
# Entrar a la carpeta del proyecto
cd carrito-zustand

# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

Abre en el navegador `http://localhost:5173`.

Otros comandos utiles:

```bash
npm run build     # Compila la version de produccion
npm run lint      # Revisa el estilo del codigo
npm run captura   # Verifica el checklist y regenera docs/captura-tienda.png
```

> `npm run captura` necesita que `npm run dev` este corriendo.

## Estructura del proyecto

```
src/
├── data/
│   └── productos.js          ← datos locales (respaldo de la API)
├── store/
│   └── useCarritoStore.js    ← estado global (Zustand)
├── components/
│   ├── Encabezado.jsx        ← titulo y contador
│   ├── ListaProductos.jsx    ← catalogo
│   └── Carrito.jsx           ← carrito y total
├── App.jsx                   ← une los componentes
├── index.css                 ← estilos de la app
└── main.jsx                  ← punto de entrada
```

Cada carpeta tiene una responsabilidad: `data` guarda la informacion,
`store` la logica del estado y `components` la parte visual.

## Como funciona el store

El store vive en `src/store/useCarritoStore.js`. Contiene:

| Elemento | Tipo | Que hace |
| --- | --- | --- |
| `items` | estado | Arreglo con los productos del carrito |
| `agregarProducto` | accion | Agrega un producto o suma 1 a su cantidad |
| `disminuirCantidad` | accion | Resta 1; si llega a 0, saca el producto (reto 1) |
| `eliminarProducto` | accion | Quita un producto por su `id` |
| `vaciarCarrito` | accion | Deja el carrito vacio |

Ningun componente guarda su propia copia del carrito: todos leen el mismo
store, por eso el `Encabezado` se actualiza aunque no reciba props.

## Retos de extension implementados

1. **Disminuir cantidad:** boton `−` en cada fila del carrito. Si la cantidad
   llega a 1 y se vuelve a pulsar, el producto sale del carrito. Tambien se
   agrego un boton `+` para aumentar.
2. **Subtotal por producto:** cada fila del carrito muestra
   `precio x cantidad` en la linea `Subtotal`.
3. **Carrito persistente:** el store usa el middleware `persist` de Zustand
   (`import { persist } from 'zustand/middleware'`), asi el carrito se guarda
   en `localStorage` con la clave `carrito-zustand` y no se pierde al recargar.
4. **Productos desde una API:** `ListaProductos` hace `fetch` a
   `https://fakestoreapi.com/products` y adapta las propiedades
   (`title → nombre`, `price → precio`, `image → imagen`). Los precios de la
   API vienen en dolares, se convierten a pesos con una tasa aproximada.
   Si la API no responde en 8 segundos, se usa `productos.js` como respaldo
   local para que la tienda siga funcionando. Para pruebas rapidas se muestran
   los primeros 8 productos (`PRODUCTOS_VISIBLES`).

## Checklist de comprobacion (paso 10)

Verificado automaticamente con `npm run captura` (13/13 correctas):

- [x] Al cargar la pagina, el carrito dice "Tu carrito esta vacio" y la insignia muestra 0.
- [x] Al agregar un producto, aparece en el carrito y la insignia sube a 1.
- [x] Al agregar otra vez el mismo producto, no se duplica la fila: la cantidad pasa a 2.
- [x] El total se recalcula con cada producto agregado.
- [x] El boton Quitar elimina solo ese producto.
- [x] El boton Vaciar carrito deja la insignia en 0 y muestra el mensaje de vacio.
- [x] En una pantalla angosta, los dos paneles se ubican uno debajo del otro
      (CSS Grid con `auto-fit` y `minmax`).
- [x] El carrito se conserva al recargar la pagina (persistencia).

## Preguntas de reflexion

**1. ¿Por que `Encabezado` se actualiza cuando agregas un producto, si no recibe
ninguna prop?**

Porque no depende de las props sino del store. `Encabezado` se suscribe a
`items` con `useCarritoStore((state) => state.items)`. Zustand avisa a todos los
componentes suscritos cuando esa parte del estado cambia y React los vuelve a
dibujar. La comunicacion ocurre a traves del store global, no del arbol de
componentes, por eso `Encabezado` y `Carrito` no necesitan ser parientes ni
compartir props.

**2. ¿Que tendrias que hacer para lograr lo mismo usando solo `useState` en
`App`?**

Tendria que subir el estado a `App` con `useState` (`const [items, setItems] =
useState([])`) y crear alli las funciones para agregar, quitar y vaciar. Luego
pasarle `items` y esas funciones hacia abajo como props: `Encabezado` recibiria
`items`, `ListaProductos` recibiria `agregarProducto` y `Carrito` recibiria
`items`, `eliminarProducto` y `vaciarCarrito`. Eso se conoce como _prop
drilling_: cada componente intermedio tiene que transportar datos que no usa.
Con Zustand cada componente se conecta directo al store y `App` solo organiza la
pagina.

**3. ¿Para que sirve el selector `(state) => state.items` al usar el hook?**

Sirve para elegir que parte del estado necesita el componente. Al pasarle un
selector, el componente solo se vuelve a dibujar cuando cambia el valor
seleccionado y no cada vez que cambia cualquier propiedad del store. Por
ejemplo, `ListaProductos` solo pide `agregarProducto`, entonces no se redibuja
cuando cambian los `items`. Es una forma de optimizar el rendimiento y de dejar
claro de que dato depende cada componente.

**4. ¿Por que en el store se crean arreglos nuevos con `map` y `filter` en lugar
de modificar `items` directamente?**

Porque en React el estado debe ser inmutable. Si se modificara el arreglo con
`push` o asignaciones directas, la referencia seguiria siendo la misma y React
(o Zustand) no detectaria el cambio, por lo que la pantalla no se actualizaria.
Al crear un arreglo nuevo con `map`, `filter` o el operador spread (`...`),
cambia la referencia y la actualizacion se propaga. Ademas evita efectos
secundarios: los datos anteriores quedan intactos y es mas facil razonar el
estado.

**5. ¿Zustand es parte de React? Explica la diferencia entre una libreria propia
de React y una del ecosistema.**

No, Zustand no es parte de React. Es una libreria externa y ligera que se
instala aparte (`npm install zustand`). Una libreria _propia_ de React es la que
mantiene el equipo de React y viene incluida o se instala desde su mismo
repositorio oficial (`react`, `react-dom`). Una libreria del _ecosistema_ es
una solucion creada por la comunidad o por terceros que se apoya en las APIs de
React para resolver un problema concreto: Zustand es un ejemplo (estado global),
como tambien lo son React Router, Redux o React Query. React funciona sin ellas;
solo agregan capacidades.

## Entregable

- [x] Proyecto React + Vite con Zustand
- [x] README con la captura de la tienda funcionando
- [x] Respuestas a las preguntas de reflexion
- [x] Los cuatro retos de extension
- [ ] Subir el proyecto a un repositorio de GitHub

> Para publicarlo: crea un repositorio vacio en GitHub y luego ejecuta
> `git remote add origin <URL>` y `git push -u origin main`.
