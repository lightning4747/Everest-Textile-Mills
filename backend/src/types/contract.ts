// @ts-nocheck
// Stub interfaces for cross-module handoffs

export const inventoryService = {
  reserveYarnForOrder: async (orderId: string, requiredKg: number) => {
    // Stub: Always returns true (sufficient stock) for testing
    // Or we could implement basic logic
    return { success: true, shortage: 0 };
  },
  dispatchRolls: async (orderId: string, rollIds: string[]) => {
    // Stub: Returns true
    return { success: true };
  }
};

export const procurementService = {
  createShortfallPO: async (orderId: string, yarnKg: number) => {
    // Stub: Create Purchase Order for shortfall
    return { poId: 'PO-999', status: 'created' };
  }
};
