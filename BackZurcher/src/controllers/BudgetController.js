const { Budget, Permit  } = require('../data');

const BudgetController = {
  async createBudget(req, res) {
    try {
      const { date, expirationDate, price, initialPayment, status, applicantName, propertyAddress } = req.body;

      // Validar campos obligatorios
      if (!date || !price || !initialPayment || !status || !applicantName || !propertyAddress) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      // Verificar que existe un permiso con esa dirección
      const permit = await Permit.findOne({ 
        where: { propertyAddress } 
      });

      if (!permit) {
        return res.status(404).json({ 
          error: 'No existe un permiso para la dirección especificada' 
        });
      }

      // Crear presupuesto
      const budget = await Budget.create({ 
        date, 
        propertyAddress, 
        expirationDate, 
        price, 
        initialPayment, 
        status, 
        applicantName 
      });

      console.log('Presupuesto creado:', budget.toJSON());
      res.status(201).json(budget);
    } catch (error) {
      console.error('Error al crear el presupuesto:', error);
      res.status(400).json({ error: error.message });
    }
  },

  async getBudgets(req, res) {
    try {
      const budgets = await Budget.findAll();
      res.status(200).json(budgets);
    } catch (error) {
      console.error('Error al obtener los presupuestos:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async getBudgetById(req, res) {
    try {
      const budget = await Budget.findByPk(req.params.idBudget); // Cambiado a idBudget
      if (!budget) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
      res.status(200).json(budget);
    } catch (error) {
      console.error('Error al obtener el presupuesto:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async updateBudget(req, res) {
    try {
      const { idBudget } = req.params;
      const { date, expirationDate, price, initialPayment, status } = req.body;

      // Validar campos obligatorios
      if (!date && !price && !initialPayment && !status && !expirationDate) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
      }

      // Actualizar presupuesto
      const [updated] = await Budget.update(
        { date, expirationDate, price, initialPayment, status },
        { where: { idBudget } }
      );

      if (!updated) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      const updatedBudget = await Budget.findByPk(idBudget);
      res.status(200).json(updatedBudget);
    } catch (error) {
      console.error('Error al actualizar el presupuesto:', error);
      res.status(400).json({ error: error.message });
    }
  },

  async deleteBudget(req, res) {
    try {
      const { idBudget } = req.params;

      // Eliminar presupuesto
      const deleted = await Budget.destroy({ where: { idBudget } });
      if (!deleted) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error al eliminar el presupuesto:', error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = BudgetController;
