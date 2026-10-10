// @ts-nocheck
import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticate, authorize } from '../middleware/auth.js';
import { uuid } from 'drizzle-orm/pg-core';
import { v4 as uuidv4 } from 'uuid';

export const productsRouter = Router();

// GET /api/v1/products - List active products
productsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.isActive, true));
    res.json(allProducts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/v1/products - Register new fabric SKU (restricted to admin, manager)
productsRouter.post('/', authenticate, authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { name, fabricType, gsm, widthInches, yarnType, yarnKgPerMetre, pricePerMetre } = req.body;
    
    // Simple ID generator for products e.g., PRD-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const id = `PRD-${randomSuffix}`;

    const [newProduct] = await db
      .insert(products)
      .values({
        id,
        name,
        fabricType,
        gsm,
        widthInches,
        yarnType,
        yarnKgPerMetre,
        pricePerMetre,
      })
      .returning();

    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PATCH /api/v1/products/:id - Update price or active status
productsRouter.patch('/:id', authenticate, authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pricePerMetre, isActive } = req.body;

    const [updatedProduct] = await db
      .update(products)
      .set({
        ...(pricePerMetre !== undefined && { pricePerMetre }),
        ...(isActive !== undefined && { isActive }),
      })
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

export default productsRouter;
