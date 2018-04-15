"use strict";

const dotenv = require("dotenv").config();
const Gpio = require("onoff").Gpio;
const TelegramBot = require("node-telegram-bot-api");

const config = {
  sensorPin: 17, // GPIO pin (NOT PIN #!!!)
  motionDetected: 1,
  minimumMotionDuration: 5, // in seconds
  timeout: 60, // seconds
  message: "Motion detected!",
  chatId: process.env.CHAT_ID,
  botToken: process.env.TELEGRAM_BOT_TOKEN
};

const bot = new TelegramBot(config.botToken, { polling: true });
const sensor = new Gpio(config.sensorPin, "in", "both");

let timeout = false;
let motionCount = 0;

/**
 * This is our main watchman of the sensor.
 */
sensor.watch(function(err, value) {
  // Motion detected
  if (value == config.motionDetected) {
    countMotionDuration();
  }
});

/**
 * Here we count motion duration so that messages aren't sent by false triggers (random sensor
 * calls). By enforcing the "motion count", we can presume a person is standing by the sensor for
 * a period of time.
 */
function countMotionDuration() {
  setTimeout(function(err, val) {
    sensor.read(function(err, val) {
      if (val == config.motionDetected) {
        motionCount++;
        console.log(
          "Motion detected: " + motionCount + "/" + config.minimumMotionDuration
        );
        checkMotionCount();
        countMotionDuration();
      } else {
        motionCount = 0;
      }
    });
  }, 1000);
}

/**
 * Check our configured motion count and make sure that the timeout has finished before sending
 * another message to Telegram.
 */
function checkMotionCount() {
  // If we are not timing motion, send a notification and start the timer
  if (!timeout && motionCount >= config.minimumMotionDuration) {
    motionCount = 0;
    notifyTelegram();
    timeout = true;
    setTimeout(function() {
      timeout = false;
    }, config.timeout * 1000);
  }
}

/**
 * Here we can message any platform but we chose Telegram.
 */
function notifyTelegram() {
  console.log("Notifying Telegram");
  bot.sendMessage(config.chatId, config.message);
}
