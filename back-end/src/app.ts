import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';

const app = express();

app.use(cors());
app.use(express.json()); //Permite recibir y enviar datos en formato JSON

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

export default app;