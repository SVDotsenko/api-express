const express = require('express');
const axios = require('axios');
const cors = require('cors');
const winston = require('winston');
const { format } = require('date-fns');
const app = express();
const port = 3001;

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            const formattedTimestamp = format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
            return `${formattedTimestamp} ${level}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'log.txt' })
    ]
});

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    const {fromCurrency, toCurrency, amount} = req.body;
    res.on('finish', () => {
        const {rate, convertedAmount} = res.locals;
        logger.info(`${amount} ${fromCurrency}, rate: ${rate}, ${convertedAmount} ${toCurrency}`);
    });
    next();
});

app.post('/convert', async (req, res) => {
    const {fromCurrency, toCurrency, amount} = req.body;

    if (!fromCurrency || !toCurrency || !amount) {
        logger.error('Missing required parameters');
        return res.status(400).send('Missing required parameters');
    }

    try {
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
        const rate = response.data.rates[toCurrency];
        if (!rate) {
            logger.error('Invalid currency code');
            return res.status(400).send('Invalid currency code');
        }

        const convertedAmount = amount * rate;
        res.locals.rate = rate;
        res.locals.convertedAmount = convertedAmount;
        res.json({
            rate,
            convertedAmount
        });
    } catch (error) {
        logger.error('Error fetching exchange rate', error);
        res.status(500).send('Error fetching exchange rate');
    }
});
app.listen(port, () => {
    logger.info(`Server is running at http://localhost:${port}`);
});