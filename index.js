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
const getBuffer = require('./utils');
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
        await fetch(`${baseUrl}/instance/restore`);
        // const JSONResponse = await res.json();
        return JSONResponse
    } catch (err) {
        console.log(err.message);
        // resp.status(500).send('Failed to fetch data');
    }
}

const instanceInfo = async (req) => {
    console.log(req.query.key, 'instance key')
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
    const reportPayload = {
        ...JSONResponse,
        messageGroupID: payload.messageGroupID,
        phone: payload.id
    }
    console.log(reportPayload, 'reportpayload')
    await sendDeliveryReport(reportPayload);

    console.log(JSONResponse, 'senttt')
    return JSONResponse;
}

const sendImageMessage = async (req, formData) => {
    try {
        const res = await fetch(`${baseUrl}/message/image?key=${req.query.key}`, {
            method: 'POST',
            body: formData
        });

        const jsonResponse = await res.json();
        console.log(jsonResponse, 'sent');
    } catch (err) {
        console.error(err.message);
    }
};

const sendVideoMessage = async (req, formData) => {
    try {
        const res = await fetch(`${baseUrl}/message/video?key=${req.query.key}`, {
            method: 'POST',
            body: formData
        });

        const jsonResponse = await res.json();
        console.log(jsonResponse, 'sent');
    } catch (err) {
        console.error(err.message);
    }
};

const checkIfInstanceIsActive = async (req) => {
    return new Promise((resolve, reject) => {
        // Check if instance is active before sending message
        instanceInfo(req)
            .then((response) => {
                console.log(response, 'response here');
                if (response.error) {
                    setTimeout(() => {
                        console.log("Instance not active yet, check will commence again in 10 secs");
                        checkIfInstanceIsActive(req).then(resolve).catch(reject);
                    }, 10000);
                } else {
                    if (response && response.instance_data && response.instance_data.user && Object.keys(response.instance_data.user).length > 0) {
                        resolve(response);
                    } else {
                        setTimeout(() => {
                            console.log("Instance not active yet, check will commence again in 10 secs");
                            checkIfInstanceIsActive(req).then(resolve).catch(reject);
                        }, 10000);
                    }
                }
            })
            .catch((error) => {
                console.log(error, 'error here');
                reject(error);
            });
    });
};

// const checkIfInstanceIsActive = async (req) => {
//     // Check if instance is active before sending message
//     try {
//         let response = await instanceInfo(req);
//         console.log(response, 'response here')
//         if (response.error) {
//             setTimeout(() => {
//                 console.log("Instance not active yet, check will commence again in 10 secs")
//                 checkIfInstanceIsActive(req);
//             }, 10000);
//         } else {
//             if (response && response.instance_data && response.instance_data.user && Object.keys(response.instance_data.user).length > 0) {
//                 return response;
//             } else {
//                 setTimeout(() => {
//                     console.log("Instance not active yet, check will commence again in 10 secs")
//                     checkIfInstanceIsActive(req);
//                 }, 10000);
//             }
//         }
//     } catch (error) {
//         console.log(error, 'error here')
//     }
// }

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

const sentBroadCastList = () => {
    fetch(`${baseUrl}/message/list?key=${'session-66d46b36-e77f'}`, {
        method: 'POST',
        body: {
            id: "",
            msgdata: {
                buttonText: "Button Text",
                text: "Middle Text",
                title: "Head Title",
                description: "Footer Description",
                sections: [
                    {
                        title: "title",
                        rows: [
                            {
                                title: "Title Option 1",
                                description: "Option Description",
                                rowId: "string"
                            }
                        ]
                    }
                ],
                listType: 0
            }
        },
        headers: {
            'Content-Type': 'application/json',
        }
    })
        .then(response => response.text())
        .then(data => {
            console.log('Broadcast sent', 'Response:', data);
            // Process the response data
        })
        .catch(error => {
            console.error('Error:', error);
            // Handle any errors
        });
}

// app.post('/send/text', async (req, resp) => {

// })

app.get('/', (req, res) => {
    res.send('<h1>Node application for whatsapp api routes</h1>');
});

console.log(process.env.TOKEN, 'token')
app.get('/instance/restore', async (req, resp) => {
    const JSONResponse = await restoreWhatsappSession(req, resp)
    resp.send(JSONResponse);
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
            console.log(response, 'instanceInfo')
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

const sendText = async (req) => {
    console.log('reachinggg')
    for (let i = 0; i < req?.body?.id?.length; i++) {
        let item = req?.body?.id[i]
        let message = req.body.message;
        const chatId = item.phoneNumber.substring(0, 1) == '+' ? item.phoneNumber.substring(1) : item.phoneNumber;
        if (message?.includes("#name#")) {
            message = message.replaceAll("#name#", item.name ? item.name : "")
        }
        const payload = {
            id: chatId,
            message,
            messageGroupID: req.body.messageGroupID
        }
        await sendMessage(req, payload)

        // Throttle request after every fifth request
        // Check if the current index is a multiple of 5 (except for the last item)
        if ((i + 1) % 5 === 0 && i < req?.body?.id?.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
        }
    }
}

const sendImage = async (req, resp) => {
    try {
        // Extract data from req.body and req.file
        const { id, message, fileUrl, messageGroupID } = req.body;
        console.log(id, message, fileUrl, messageGroupID, 'here')
        const { url, fileType } = JSON.parse(fileUrl)
        console.log(url, fileType)
        const bufferFile = await getBuffer(url)
        console.log(bufferFile)

        if (!id || !Array.isArray(id) || id.length === 0 || !message || !fileUrl) {
            return resp.status(400).send('Invalid request body');
        }

        for (const item of id) {
            const caption = message.includes("#name#") ? message.replaceAll("#name#", item.name ? item.name : "") : message;
            const chatId = item.phoneNumber.startsWith('+') ? item.phoneNumber.substring(1) : item.phoneNumber;
            // Create a new FormData object
            const formData = new FormData();

            // Append text data from req.body
            formData.append('id', chatId);
            formData.append('caption', caption);

            // Convert buffer to Blob
            const fileBlob = new Blob([bufferFile], { type: fileType });
            formData.append('file', fileBlob, 'filename')

            console.log('reaching')
            await sendImageMessage(req, formData);

            // Throttle request after every fifth request
            // Check if the current index is a multiple of 5 (except for the last item)
            const i = id.indexOf(item);
            if ((i + 1) % 5 === 0 && i < id.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 10000));
            }
        }
        // Send the final response after all messages have been sent
        resp.send({ message: 'All messages sent with images' });

    } catch (err) {
        console.error(err, 'error here');
        resp.status(500).send('Internal server error');
    }
}

const sendVideo = async (req, resp) => {
    try {
        // Extract data from req.body and req.file
        const { id, message, fileUrl, messageGroupID } = req.body;
        console.log(id, message, fileUrl, messageGroupID, 'here')
        const { url, fileType } = JSON.parse(fileUrl)
        console.log(url, fileType)
        const bufferFile = await getBuffer(url)
        console.log(bufferFile)

        if (!id || !Array.isArray(id) || id.length === 0 || !message || !fileUrl) {
            return resp.status(400).send('Invalid request body');
        }

        for (const item of id) {
            const caption = message.includes("#name#") ? message.replaceAll("#name#", item.name ? item.name : "") : message;
            const chatId = item.phoneNumber.startsWith('+') ? item.phoneNumber.substring(1) : item.phoneNumber;
            // Create a new FormData object
            const formData = new FormData();

            // Append text data from req.body
            formData.append('id', chatId);
            formData.append('caption', caption);

            // Convert buffer to Blob
            const fileBlob = new Blob([bufferFile], { type: fileType });
            formData.append('file', fileBlob, 'filename')

            console.log('reaching')
            await sendVideoMessage(req, formData);

            // Throttle request after every fifth request
            // Check if the current index is a multiple of 5 (except for the last item)
            const i = id.indexOf(item);
            if ((i + 1) % 5 === 0 && i < id.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 10000));
            }
        }
        // Send the final response after all messages have been sent
        resp.send({ message: 'All messages sent with video' });

    } catch (err) {
        console.error(err, 'error here');
        resp.status(500).send('Internal server error');
    }
}

app.post('/send/text', async (req, resp) => {
    await sendText(req);
    // sentBroadCastList()
    // Send the final response after all messages have been sent
    resp.send({ message: 'All messages sent' });
});

app.post('/send/image', async (req, resp) => {
    await sendImage(req, resp)
});

app.post('/send/video', async (req, resp) => {
    await sendVideo(req, resp)
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


app.post('/api/whatsapp/schedule', async (req, resp) => {
    try {
        const { chatRecipients, message, messageGroupID, sessionId, date, fileUrl } = req.body;
        req.query.key = sessionId;
        req.body.id = chatRecipients
        console.log({ chatRecipients, message, messageGroupID, sessionId, date, fileUrl })

        // Restore session
        await restoreWhatsappSession(req, resp);
        console.log('restored');

        // Check if instance is active
        const response = await checkIfInstanceIsActive(req);
        console.log(response, 'Instance active');
        if (fileUrl && fileUrl.length > 0) {
            req.body.fileUrl = fileUrl
            let parseFile = JSON.parse(fileUrl);
            if (parseFile.fileType.includes("image")) {
                await sendImage(req, resp)
            } else if (parseFile.fileType.includes("video")) {
                await sendVideo(req, resp)
            } else {
                console.log("Different file type")
            }
        } else {
            await sendText(req)
            // Send the final response after all messages have been sent
            resp.send({ message: 'All messages sent' });
        }
    } catch (error) {
        console.error(error);
        resp.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log('running at', port)
});
