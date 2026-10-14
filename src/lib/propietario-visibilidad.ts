// Apartados del propietario que se ocultan desde que las solicitudes de los clientes le llegan solo a
// Captive (Clientes y prospectos del panel de administración). Las pantallas siguen existiendo
// (/mensajes y /leads): para volver a mostrar un apartado, poner su valor en `true`.

// "Mensajes" en el menú de la cuenta. Mientras esté oculto, el propietario tiene "Chat con Captive"
// (/mensajes/captive) en su lugar.
export const MENSAJES_VISIBLE_PARA_PROPIETARIO = false;

// "Bandeja de entrada" (/leads) en el menú de la cuenta y la liga desde la tarjeta "Solicitudes"
// de su panel.
export const BANDEJA_VISIBLE_PARA_PROPIETARIO = false;
