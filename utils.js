const fetch = require("node-fetch");
const request = require('request');

const getBuffer = async (url) => {
    // const url = "https://churchplusstorage.blob.core.windows.net/whatsappcontainer/FC_logo_176bb861-d22e-4598-b2fe-f877888d819c_11072024.jpeg"
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(buffer)
      return buffer;
    } catch (error) {
      return { error };
    }
  };


  const getFileBody = async (url) => {
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return response.body
  }

  module.exports = {
    getBuffer,
    getFileBody
  }