import { configuracionPagoRepository } from "@/repositories/configuracion-pago.repository";
import { entregasDisponibles, metodosDisponibles, motivoParaNoVender } from "@/lib/reglas-de-pago";
import type { GuardarConfiguracionPagoInput } from "@/schemas/configuracion-pago.schema";

export const configuracionPagoService = {
  /** Todo, para el panel. */
  obtener() {
    return configuracionPagoRepository.obtener();
  },

  async guardar(cambios: GuardarConfiguracionPagoInput) {
    return configuracionPagoRepository.guardar(cambios);
  },

  async vaciar() {
    return configuracionPagoRepository.vaciar();
  },

  /**
   * Lo que ve quien compra.
   *
   * No sale el correo de avisos ni los interruptores crudos: solo los datos
   * para pagar y que opciones quedan habilitadas. El resto es de la tienda.
   */
  async publica() {
    const config = await configuracionPagoRepository.obtener();

    return {
      titular: config.titular,
      yape: config.yape,
      banco: config.banco,
      cuenta: config.cuenta,
      cci: config.cci,
      metodos: metodosDisponibles(config),
      entregas: entregasDisponibles(config),
      costoDelivery: config.costoDelivery.toFixed(2),
      motivo: motivoParaNoVender(config),
    };
  },
};
