import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';
import { Socket } from 'net';
import { EOL } from 'os';
import { debug } from './log';

const eolLength = Buffer.byteLength(EOL);

/**
 * Add some overrides to the EventEmitter interface
 */
export interface MessageHandler extends EventEmitter {
	on(event: 'message', listener: (message: protocol.Message) => void): this;
	on(event: 'request', listener: (message: protocol.Request) => void): this;
	on(event: 'response', listener: (message: protocol.Response) => void): this;
	on(event: 'data', listener: (data: Buffer) => void): this;
	on(event: 'error', listener: (error: Error) => void): this;
}

/**
 * Emits Messages as data is read from an input stream
 *
 * Data format is "Content-Length: <number>\r\n\r\n<data>EOL"
 */
export class MessageHandler extends EventEmitter {
	protected buf: Buffer = Buffer.alloc(0);
	protected stream: Readable;
	protected dataHandler: (data: Buffer) => void;
	protected errorHandler: (error: Error) => void;

	constructor(stream: Readable) {
		super();

		this.stream = stream;

		this.dataHandler = (data: Buffer) => {
			this.write(data);
			this.emit('data', data);
		};

		this.errorHandler = (error: Error) => {
			this.emit('error', error);
		};

		stream.on('data', this.dataHandler);
		stream.on('error', this.errorHandler);
	}

	close() {
		if (this.dataHandler) {
			this.stream.removeListener('data', this.dataHandler);
			this.stream.removeListener('error', this.errorHandler);
			this.dataHandler = null;
			this.errorHandler = null;
			this.buf = null;
			this.stream = null;
		}
	}

	protected write(data: Buffer) {
		debug(`Received data <<<${data.toString('utf8')}>>>`);
		this.buf = Buffer.concat([ this.buf, data ]);
		this.processMessages();
	}

	/**
	 * Process messages of the format "Content-Length: <number>\r\n\r\n<data><EOL>"
	 */
	protected processMessages() {
		const header = this.buf.toString('utf8', 0, lengthHeader.length);
		if (header !== 'Content-Length: ') {
			console.error(`Invalid header "${header}"`);
			return;
		}

		const lengthEnd = this.buf.indexOf('\r\n\r\n', lengthHeader.length);
		const contentStart = lengthEnd + 4;
		// The real content length is (Content-Length - 1)
		const contentLength = Number(this.buf.toString('utf8', lengthHeader.length, lengthEnd)) - 1;
		const contentEnd = contentStart + contentLength;

		if (contentEnd > this.buf.length) {
			debug('Message is incomplete');
			return;
		}

		const content = this.buf.toString('utf8', contentStart, contentEnd);
		const message = <protocol.Message> JSON.parse(content);

		debug(`Emitting message <<<${content}>>>`);
		this.emit('message', message);

		switch (message.type) {
		case 'request':
			this.emit('request', <protocol.Request> message);
			break;
		case 'response':
			this.emit('response', <protocol.Response> message);
			break;
		case 'event':
			this.emit('event', <protocol.Event> message);
			break;
		}

		this.buf = this.buf.slice(contentEnd + eolLength);
		if (this.buf.length > lengthHeader.length) {
			this.processMessages();
		}
	}
}

export function send(out: Socket | Writable, message: protocol.Message): Promise<void> {
	return new Promise<void>(resolve => {
		const data = JSON.stringify(message);
		const length = Buffer.byteLength(data, 'utf8');
		// Write data in the same format as tsserver#formatMessage
		out.write(`Content-Length: ${length + 1}\r\n\r\n${data}${EOL}`, 'utf8', resolve);
	});
}

const lengthHeader = 'Content-Length: ';
