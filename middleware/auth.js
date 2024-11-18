import jwt from "jsonwebtoken";

const authenticateToken = (req,res,next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if(!token){
        return res.status(401).json({error: "Access denied. No token provided."});
    }

    try{
        console.log(token)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(decoded)
        req.user = decoded;
        next();
    }catch(error){
        res.status(400).json({error: "Inavalid token"});
    }
};

export default authenticateToken;