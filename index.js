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
const baseUrl = process.env.NODE_ENV === "production" ? process.env.BASE_URL : "http://localhost:3333"

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
console.log(process.env.NODE_ENV)

const restoreWhatsappSession = async (req, resp) => {
    console.log(`${baseUrl}/instance/restore`)
    try {
        const res = await fetch(`${baseUrl}/instance/restore`);
        const JSONResponse = await res.json();
        resp.send(JSONResponse);
        // return JSONResponse
    } catch (err) {
        console.log(err.message);
        resp.status(500).send('Failed to fetch data');
    }
}

const instanceInfo = async (req) => {
    try {
        const res = await fetch(`${baseUrl}/instance/info?key=${req.query.key}`);
        const JSONResponse = await res.json();
        return JSONResponse
    } catch (err) {
        console.log(err.message);
        return err
    }
}

const sendMessage = async (req, payload) => {
    // console.log(payload, 'reaching here')
    // console.log(req.query.key, 'reaching 22')
    // try {
    //     const res = await fetch(`${baseUrl}/message/text?key=${req.query.key}`, {
    //         method: 'POST', // Change the method to POST
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify(payload),
    //     });
    //     const JSONResponse = await res.json();
    //     resp.send(JSONResponse);
    //     await sendDeliveryReport(JSONResponse);
    //     console.log(JSONResponse, 'senttt')
    // } catch (err) {
    //     console.log(err.message);
    //     resp.status(500).send('Failed to fetch data');
    // }
    console.log(payload, 'reaching here')
    console.log(req.query.key, 'reaching 22')
    const res = await fetch(`${baseUrl}/message/text?key=${req.query.key}`, {
        method: 'POST', // Change the method to POST
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    const JSONResponse = await res.json();
    await sendDeliveryReport(JSONResponse);

    console.log(JSONResponse, 'senttt')
    return JSONResponse;
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

let instanceCallSum = 0
const checkIfInstanceIsActive = async (req) => {
    // Check if instance is active before sending message
    try {
        let response = await instanceInfo(req);
        console.log(response, 'response here')
        if (response.error) {
            instanceCallSum++
            console.log(instanceCallSum)
            if (instanceCallSum === 30) {
                console.log('stop!')
                return;
            } else {
                return checkIfInstanceIsActive(req)
            }
        } else {
            return response;
        }
    } catch (error) {
        console.log(error, 'error here')
    }
}

const sendDeliveryReport = async (payload) => {
    // try {
    fetch(`https://churchplusv3coreapi.azurewebsites.net/WhatsAppDeliveryReport`, {
        method: 'POST',
        body: payload,
        headers: {
            'Content-Type': 'application/json',
        }
    })
        .then(response => response.text())
        .then(data => {
            console.log('Report sent', 'Response:', data);
            // Process the response data
        })
        .catch(error => {
            console.error('Error:', error);
            // Handle any errors
        });
}



app.get('/', (req, res) => {
    res.send('<h1>Node application for whatsapp api routes</h1>');
});

console.log(process.env.TOKEN, 'token')
app.get('/instance/restore', async (req, resp) => {
    await restoreWhatsappSession(req, resp)
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
    instanceInfo(req)
        .then(response => {
            resp.send(response);
        })
        .catch(error => {
            console.error(error)
            resp.status(500).send('Failed to fetch data');
        })
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
    for (let i = 0; i < req?.body?.id?.length; i++) {
        let item = req?.body?.id[i]
        let message = req.body.message;
        const chatId = item.phoneNumber.substring(0, 1) == '+' ? item.phoneNumber.substring(1) : item.phoneNumber;
        if (message?.includes("#name#")) {
            message = message.replaceAll("#name#", item.name ? item.name : "")
        }
        const payload = {
            id: chatId,
            message
        }
        console.log(message, chatId, 'value')
        await sendMessage(req, payload)

        // Throttle request after every fifth request
        // Check if the current index is a multiple of 5 (except for the last item)
        if ((i + 1) % 5 === 0 && i < req?.body?.id?.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
        }
    }
    // Send the final response after all messages have been sent
    resp.send({ message: 'All messages sent' });
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

app.delete('/instance/logout', async (req, resp) => {
    try {
        const res = await fetch(`${baseUrl}/instance/logout?key=${req.query.key}`, {
            method: 'DELETE'
        });
        console.log(res, 'resss')
        if (!res.ok) {
            resp.send({ message: `HTTP error! Status: ${res.status}` });
        }
        console.log('worked')

        const JSONResponse = await res.json();
        resp.send(JSONResponse);
    } catch (error) {
        console.error(error)
    }
})

// app.post('/api/whatsapp/schedule', async (req, resp) => {
//     console.log(req.body);
//     req.query.key = req.body.sessionId;
//     console.log(req.query.key, 'query set')

//     await restoreWhatsappSession(req, resp)
//         .then(() => {
//             console.log('restored')
//             checkIfInstanceIsActive(req)
//                 .then(response => {
//                     console.log(response, 'here222')
//                     if (response && !response.error) {
//                         req?.body?.chatRecipients?.forEach(item => {
//                             let message = req.body.message;
//                             const chatId = item.phoneNumber.substring(0, 1) == '+' ? item.phoneNumber.substring(1) : item.phoneNumber;
//                             if (req.body?.message?.includes("#name#")) {
//                                 message = message.replaceAll("#name#", item.name ? item.name : "")
//                             }
//                             const payload = {
//                                 id: chatId,
//                                 message
//                             }
//                             sendMessage(req, payload)
//                         });
//                     } else {

//                         resp.status(500).send('Failed to fetch data');
//                     }
//                 })
//                 .catch(error => {
//                     console.error(error)
//                 })
//         })
//         .catch((err) => console.error(err))
// })


app.post('/api/whatsapp/schedule', async (req, resp) => {
    try {
        console.log(req.body);
        req.query.key = req.body.sessionId;
        console.log(req.query.key, 'query set')

        await restoreWhatsappSession(req, resp);

        console.log('restored');

        const response = await checkIfInstanceIsActive(req);

        console.log(response, 'here222');

        if (response && !response.error) {
            for (const item of req.body.chatRecipients) {
                let message = req.body.message;
                const chatId = item.phoneNumber.startsWith('+') ? item.phoneNumber.substring(1) : item.phoneNumber;
                if (req.body.message.includes("#name#")) {
                    message = message.replaceAll("#name#", item.name ? item.name : "");
                }
                const payload = {
                    id: chatId,
                    message
                };
                await sendMessage(req, payload);
            }
        } else {
            console.log('Failed to send please try again')
            // resp.status(500).send('Failed to fetch data');
        }
    } catch (error) {
        console.error(error);
        resp.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log('running at', port)
});
