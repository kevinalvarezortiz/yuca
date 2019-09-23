import yargs from 'yargs';
import jsonfile from 'jsonfile';
import mqtt from 'mqtt';

const PROTOCOLS = {
    MQTT: 'mqtt',
    MQTTS: 'mqtts'
};

const OPTIONS = {
    tls: {
        describe: 'Enables mqtt over tls',
        nargs: 0,
        required: false,
        boolean: true
    },
    host: {
        alias: 'h',
        describe: 'Mqtt broker host',
        nargs: 1,
        required: true
    },
    port: {
        alias: 'p',
        describe: 'Mqtt broker port',
        nargs: 1,
        required: false,
        default: 1883
    },
    topic: {
        alias: 't',
        describe: 'Mqtt topic to route message',
        nargs: 1,
        required: true
    },
    file: {
        alias: 'f',
        describe: 'Load json file as message. Exclusive with \'message\'',
        nargs: 1,
        required: false
    },
    message: {
        alias: 'm',
        describe: 'String message. Exclusive with \'file\'',
        nargs: 1,
        required: false
    }
};

/**
 * Parses args and their values.
 * @param {Array} args agument array.
 * @returns {Object} 
 */
function parseArguments() {
    Object.keys(OPTIONS).forEach((key) => {
        const current = OPTIONS[key];
        if (current.alias) yargs.alias(key, current.alias);
        if (current.boolean) yargs.boolean(key);
        yargs.describe(key, current.describe)
        .nargs(key, current.nargs)
        .required(key, current.required)
        .default(key, current.default);
    });
    yargs.strict(true)
    .conflicts('file', 'message')
    .example('yuca --file path/to/file.json', 'Uses a json file as message')
    .example('yuca --message \'Hello world\'', 'Sends a string message');
    return yargs.argv;
}

/**
 * Reads a file's content with a given path.
 * @param {String} file file name with path.
 * @returns {String} file content converted to string or raises an error if file does not exists.
 */
function getFile(file) {
    try {
        const json = jsonfile.readFileSync(file);
        if (!json) {
            throw new Error('No such file or directory');
        }
        return JSON.stringify(json);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

/**
 * Gets Mqtt connection options.
 * @param {Object} args argument object.
 * @returns {Object} option object.
 */
function getMqttOptions(args) {
    const options = {
        tls: args.tls,
        host: args.host,
        port: args.port,
        topic: args.topic
    };
    return options;
}

/**
 * Gets message from message option or file option. 
 * @param {Object} args argument object.
 * @returns {String} message.
 */
function getMessage(args) {
    if (!args.message && !args.file) {
        return '';
    }
    if (args.message) {
        return args.message;
    }
    return getFile(args.file);
}

/**
 * Sends a message with a given mqtt configuration and a string message.
 * @param {Object} options mqtt config object.
 * @param {String} message string message.
 */
function sendMessage(options, message) {
    const protocol = options.tls ? PROTOCOLS.MQTTS : PROTOCOLS.MQTT;
    const client = mqtt.connect(`${protocol}://${options.host}:${options.port}`);
    client.on('connect', function() {
        client.publish(options.topic, message);
        client.end();
    });
}

/**
 * Main function for entry point.
 */
export function cli() {
    const args = parseArguments();
    const options = getMqttOptions(args);
    const message = getMessage(args);
    sendMessage(options, message);
}
