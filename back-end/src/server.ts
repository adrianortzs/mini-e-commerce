import app from './app';
import dotenv from 'dotenv';

dotenv.config(); //Carga las variables de entorno del archivo .env

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});