import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'myextremelysecretkey';

export const generateToken = (payload: object): string => {
    return jwt.sign(payload, SECRET_KEY);
};  

export const verifyToken = (token: string): object | null => {
    try {
        return jwt.verify(token, SECRET_KEY) as object;
    } catch (error) {
        return null;
    }
};