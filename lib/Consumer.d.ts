/// <reference types="node" />
import EventEmitter from 'node:events';
import type { AsyncMessage, MethodParams, MessageBody, Envelope, Cmd } from './codec';
type BasicConsumeParams = MethodParams[Cmd.BasicConsume];
export interface ConsumerProps extends BasicConsumeParams {
    /** Non-zero positive integer. Maximum number of messages to process at once.
     * Should be less than or equal to "qos.prefetchCount". Any prefetched, but
     * unworked, messages will be requeued when the underlying channel is closed
     * (unless noAck=true, when every received message will be processed).
     * @default Infinity */
    concurrency?: number;
    /** Requeue message when the handler throws an Error
     * (as with {@link Channel.basicNack})
     * @default true */
    requeue?: boolean;
    /** Additional options when declaring the queue just before creating the
     * consumer and whenever the connection is reset. */
    queueOptions?: MethodParams[Cmd.QueueDeclare];
    /** If defined, basicQos() is invoked just before creating the consumer and
     * whenever the connection is reset */
    qos?: MethodParams[Cmd.BasicQos];
    /** Any exchanges to be declared before the consumer and whenever the
     * connection is reset. See {@link Channel.exchangeDeclare} */
    exchanges?: Array<MethodParams[Cmd.ExchangeDeclare]>;
    /** Any queue-exchange bindings to be declared before the consumer and
     * whenever the connection is reset. See {@link Channel.queueBind} */
    queueBindings?: Array<MethodParams[Cmd.QueueBind]>;
    /** Any exchange-exchange bindings to be declared before the consumer and
     * whenever the connection is reset. See {@link Channel.exchangeBind} */
    exchangeBindings?: Array<MethodParams[Cmd.ExchangeBind]>;
}
/**
 * @param msg The incoming message
 * @param reply Reply to an RPC-type message. Like {@link Channel#basicPublish | Channel#basicPublish()}
 *              but the message body comes first. Some fields are also set automaticaly:
 * - routingKey = msg.replyTo
 * - correlationId = msg.correlationId
 */
export interface ConsumerHandler {
    (msg: AsyncMessage, reply: (body: MessageBody, envelope?: Envelope) => Promise<void>): Promise<ConsumerStatus | void> | ConsumerStatus | void;
}
export declare enum ConsumerStatus {
    /** BasicAck */
    ACK = 0,
    /** BasicNack(requeue=true). The message is returned to the queue. */
    REQUEUE = 1,
    /** BasicNack(requeue=false). The message is sent to the
     * configured dead-letter exchange, if any, or discarded. */
    DROP = 2
}
export declare interface Consumer {
    /** The consumer is successfully (re)created */
    on(name: 'ready', cb: () => void): this;
    /** Errors are emitted if a message handler fails, or if channel setup fails,
     * or if the consumer is cancelled by the server (like when the queue is deleted). */
    on(name: 'error', cb: (err: any) => void): this;
}
/**
 * @see {@link Connection#createConsumer | Connection#createConsumer()}
 * @see {@link ConsumerProps}
 * @see {@link ConsumerHandler}
 *
 * This will create a dedicated Channel, declare a queue, declare exchanges,
 * declare bindings, establish QoS, and finally start consuming messages. If
 * the connection is reset, then all of this setup will re-run on a new
 * Channel. This uses the same retry-delay logic as the Connection.
 *
 * The callback is called for each incoming message. If it throws an error then
 * the message is rejected (BasicNack) and possibly requeued, or sent to a
 * dead-letter exchange. The error is then emitted as an event. The callback
 * can also return a numeric status code to control the ACK/NACK behavior. The
 * {@link ConsumerStatus} enum is provided for convenience.
 *
 * ACK/NACK behavior when the callback:
 * - throws an error - BasicNack(requeue=ConsumerProps.requeue)
 * - returns 0 or undefined - BasicAck
 * - returns 1 - BasicNack(requeue=true)
 * - returns 2 - BasicNack(requeue=false)
 *
 * About concurency: For best performance, you'll likely want to start with
 * concurrency=X and qos.prefetchCount=2X. In other words, up to 2X messages
 * are loaded into memory, but only X ConsumerHandlers are running
 * concurrently. The consumer won't need to wait for a new message if one has
 * alredy been prefetched, minimizing idle time. With more worker processes,
 * you will want a lower prefetchCount to avoid worker-starvation.
 *
 * The 2nd argument of `handler(msg, reply)` can be used to reply to RPC
 * requests. e.g. `await reply('my-response-body')`. This acts like
 * basicPublish() except the message body comes first. Some fields are also set
 * automaticaly. See ConsumerHandler for more detail.
 *
 * This is an EventEmitter that may emit errors. Also, since this wraps a
 * Channel, this must be closed before closing the Connection.
 *
 * @example
 * ```
 * const sub = rabbit.createConsumer({queue: 'my-queue'}, async (msg, reply) => {
 *   console.log(msg)
 *   // ... do some work ...
 *
 *   // optionally reply to an RPC-type message
 *   await reply('my-response-data')
 *
 *   // optionally return a status code
 *   if (somethingBad) {
 *     return ConsumerStatus.DROP
 *   }
 * })
 *
 * sub.on('error', (err) => {
 *   console.log('consumer error (my-queue)', err)
 * })
 *
 * // when closing the application
 * await sub.close()
 * ```
 */
export declare class Consumer extends EventEmitter {
    /** Maximum number of messages to process at once. Non-zero positive integer.
     * Writeable. */
    concurrency: number;
    /** Get current queue name. If the queue name was left blank in
     * ConsumerProps, then this will change whenever the channel is reset, as the
     * name is randomly generated. */
    get queue(): string;
    /** Get the current consumer ID. If generated by the broker, then this will
     * change each time the consumer is ready. */
    get consumerTag(): string;
    /** Some statistics about this Consumer */
    readonly stats: {
        /** Total acknowledged messages */
        acknowledged: number;
        /** Total messages rejected BasicNack(requeue=false) */
        dropped: number;
        /** Size of the queue when this consumer started */
        initialMessageCount: number;
        /** How many messages are in memory, waiting to be processed */
        prefetched: number;
        /** Total messages rejected with BasicNack(requeue=true) */
        requeued: number;
    };
    /** Stop consuming messages. Close the channel once all pending message
     * handlers have settled. If called while the Connection is reconnecting,
     * then this may be delayed by {@link ConnectionOptions.acquireTimeout} */
    close(): Promise<void>;
}
export {};
