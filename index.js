// Create a basic app with express
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const http = require("http");
const https = require("https");
const server = http.createServer(app);
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const multer = require('multer');
// const FormData = require('form-data');

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
// const baseUrl = process.env.NODE_ENV === "production" ? process.env.BASE_URL : "http://localhost:3333"
const baseUrl = process.env.BASE_URL

app.use(cors({
    origin: '*', // Specify the allowed origin (replace with your client's domain)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Specify the allowed HTTP methods
    allowedHeaders: 'Content-Type,Authorization', // Specify the allowed headers
    credentials: true, // Allow credentials (cookies, auth headers) to be sent with the request
    optionsSuccessStatus: 204, // Some legacy browsers (IE11) choke on a 204 response. Set to 200 if you want to support such browsers.
}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

dotenv.config();

const sendMessage = async (req, resp, payload) => {
    console.log(payload, 'reaching here')
    console.log(req.query.key, 'reaching 22')
    try {
        const res = await fetch(`${baseUrl}/message/text?key=${req.query.key}`, {
            method: 'POST', // Change the method to POST
            headers: {
                'Content-Type': 'application/json',
                // Add any other headers if required by your server
            },
            body: JSON.stringify(payload),
        });
        const JSONResponse = await res.json();
        console.log(JSONResponse, 'sent')
    } catch (err) {
        console.log(err.message);
        resp.status(500).send('Failed to fetch data');
    }
}

const sendImageMessage = async (req, resp, formData) => {
    try {
        const res = await fetch(`${baseUrl}/message/image?key=${req.query.key}`, {
            method: 'POST',
            body: formData
        });

        const jsonResponse = await res.json();
        console.log(jsonResponse, 'sent');
    } catch (err) {
        console.error(err.message);
        resp.status(500).send('Failed to fetch data');
    }
};

const sendVideoMessage = async (req, resp, formData) => {
    try {
        const res = await fetch(`${baseUrl}/message/video?key=${req.query.key}`, {
            method: 'POST',
            body: formData
        });

        const jsonResponse = await res.json();
        console.log(jsonResponse, 'sent');
    } catch (err) {
        console.error(err.message);
        resp.status(500).send('Failed to fetch data');
    }
};



app.get('/', (req, res) => {
    res.send('<h1>Node application for whatsapp api routes</h1>');
});

console.log(process.env.TOKEN, 'token')
app.get('/instance/restore', async (req, resp) => {
    console.log(`${baseUrl}/instance/restore`)
    try {
        const res = await fetch(`${baseUrl}/instance/restore`);
        const JSONResponse = await res.json();
        resp.send(JSONResponse);
    } catch (err) {
        console.log(err.message);
        resp.status(500).send('Failed to fetch data');
    }
});

app.get('/initializeWhatsapp', async (req, resp) => {
    try {
        const res = await fetch(`${baseUrl}/instance/init?key=${req.query.key}&token=${process.env.TOKEN}`);
        const JSONResponse = await res.json();
        resp.send(JSONResponse);
    } catch (err) {
        console.log(err.message);
        resp.status(500).send('Failed to fetch data');
    }
});

app.get('/scanQRCode', async (req, resp) => {
    try {
        const res = await fetch(`${baseUrl}/instance/qrbase64?key=${req.query.key}`);
        const JSONResponse = await res.json();
        resp.send(JSONResponse);
    } catch (err) {
        console.log(err.message);
        resp.status(500).send('Failed to fetch data');
    }
});

app.get('/single/instanceInfo', async (req, resp) => {
    try {
        const res = await fetch(`${baseUrl}/instance/info?key=${req.query.key}`);
        const JSONResponse = await res.json();
        resp.send(JSONResponse);
    } catch (err) {
        console.log(err.message);
        resp.status(500).send('Failed to fetch data');
    }
});

app.get('/groups/getAllWhatsappGroups', async (req, resp) => {
    try {
        const res = await fetch(`${baseUrl}/group/getallgroups?key=${req.query.key}`);
        const JSONResponse = await res.json();
        resp.send(JSONResponse);
    } catch (err) {
        console.log(err.message);
        resp.status(500).send('Failed to fetch data');
    }
});

app.post('/send/text', async (req, resp) => {
    console.log(req.body);
    req?.body?.id?.forEach(item => {
        let message = req.body.message;
        const chatId = item.phoneNumber.substring(0, 1) == '+' ? item.phoneNumber.substring(1) : item.phoneNumber;
        if (req.body?.message?.includes("#name#")) {
            message = message.replaceAll("#name#", item.name ? item.name : "")
        }
        const payload = {
            id: chatId,
            message
        }
        console.log(message, chatId, 'value')

        sendMessage(req, resp, payload)
    });
});

app.post('/send/image', upload.single('file'), async (req, resp) => {
    try {
        // Extract data from req.body and req.file
        const { id, caption } = req.body;
        const file = req.file;
        const parsedContacts = JSON.parse(id)

        if (!parsedContacts || !Array.isArray(parsedContacts) || parsedContacts.length === 0 || !caption || !file) {
            return resp.status(400).send('Invalid request body');
        }

        for (const item of parsedContacts) {
            const message = caption.includes("#name#") ? caption.replaceAll("#name#", item.name ? item.name : "") : caption;
            const chatId = item.phoneNumber.startsWith('+') ? item.phoneNumber.substring(1) : item.phoneNumber;
            // Create a new FormData object
            const formData = new FormData();

            // Append text data from req.body
            formData.append('id', chatId);
            formData.append('caption', message);

            // Convert buffer to Blob
            const fileBlob = new Blob([file.buffer], { type: file.mimetype });
            formData.append('file', fileBlob, file.originalname)

            console.log('reaching')
            await sendImageMessage(req, resp, formData);
        }

    } catch (err) {
        console.error(err, 'error here');
        resp.status(500).send('Internal server error');
    }
});


app.post('/send/video', upload.single('file'), async (req, resp) => {
    try {
        // Extract data from req.body and req.file
        const { id, caption } = req.body;
        const file = req.file;
        const parsedContacts = JSON.parse(id)

        if (!parsedContacts || !Array.isArray(parsedContacts) || parsedContacts.length === 0 || !caption || !file) {
            return resp.status(400).send('Invalid request body');
        }

        for (const item of parsedContacts) {
            const message = caption.includes("#name#") ? caption.replaceAll("#name#", item.name ? item.name : "") : caption;
            const chatId = item.phoneNumber.startsWith('+') ? item.phoneNumber.substring(1) : item.phoneNumber;
            // Create a new FormData object
            const formData = new FormData();

            // Append text data from req.body
            formData.append('id', chatId);
            formData.append('caption', message);

            // Convert buffer to Blob
            const fileBlob = new Blob([file.buffer], { type: file.mimetype });
            formData.append('file', fileBlob, file.originalname)
            await sendVideoMessage(req, resp, formData);
        }

    } catch (err) {
        console.error(err, 'error here');
        resp.status(500).send('Internal server error');
    }
});



app.listen(port, () => {
    console.log('running at', port)
});