import * as z from 'zod/v4';
export const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const projectId = z.string().regex(/^[a-z0-9_-]{1,80}$/);
export const fingerprint = z.string().regex(/^[a-f0-9]{64}$/).describe('Fingerprint returned by the last inspection. Conflicts require fresh inspection and review.');
export const frame = z.number().int().min(0).max(1_000_000_000);
const scalar = z.union([z.number(), z.string().max(65536), z.boolean()]);
const properties = z.record(z.string().max(100), scalar);
const object = z.record(z.string().max(100), z.unknown());
export const transform = z.strictObject({ x:z.number(), y:z.number(), rotation:z.number(), scaleX:z.number(), scaleY:z.number(), anchorX:z.number(), anchorY:z.number() }).partial();
const ratio = z.strictObject({ numerator:frame, denominator:frame.min(1) });
const easing = z.union([z.enum(['linear','hold','ease','ease-in','ease-out','ease-in-out']),z.tuple([z.number(),z.number(),z.number(),z.number()])]);
const key = z.strictObject({ frame, value:scalar, easing:easing.optional() });
const transition = z.strictObject({ type:z.literal('fade'),duration:frame.min(1) }).nullable();
export const nodeSpecification = z.strictObject({ id:id.optional(), type:z.string().max(80), name:z.string().max(200).optional(), parentId:id.optional(), start:frame.optional(), duration:frame.min(1).optional(), props:properties.optional(), transform:transform.optional(), opacity:z.number().min(0).max(1).optional(), index:frame.optional() });
const changes = z.strictObject({ name:z.string().max(200).optional(), time:z.strictObject({ start:frame.optional(),duration:frame.min(1).optional(),offset:ratio.optional(),speed:ratio.optional() }).optional(), transform:transform.optional(), opacity:z.number().min(0).max(1).optional(), visible:z.boolean().optional(), locked:z.boolean().optional(), blend:z.string().max(30).optional(), props:properties.optional(), extensions:object.optional() });
export const operation = z.discriminatedUnion('op',[
 z.strictObject({op:z.literal('node.add'),node:object,parentId:id,index:frame.optional()}),
 z.strictObject({op:z.literal('node.patch'),id,changes}),
 z.strictObject({op:z.literal('node.remove'),id,cascade:z.boolean().optional()}),
 z.strictObject({op:z.literal('node.move'),id,parentId:id,index:frame.optional()}),
 z.strictObject({op:z.literal('animation.set'),id,property:z.string().max(200),keyframes:z.array(key).min(1).max(4096).nullable()}),
 z.strictObject({op:z.literal('effect.add'),id,effect:z.strictObject({id,type:z.string().max(80),version:z.number().int().min(1).max(10000),enabled:z.boolean(),props:properties}),index:frame.optional()}),
 z.strictObject({op:z.literal('effect.patch'),id,effectId:id,props:properties.optional(),enabled:z.boolean().optional()}),
 z.strictObject({op:z.literal('effect.remove'),id,effectId:id}),
 z.strictObject({op:z.literal('behavior.add'),id,behavior:z.strictObject({id,type:z.string().max(80),version:z.number().int().min(1).max(10000),enabled:z.boolean(),props:properties}),index:frame.optional()}),
 z.strictObject({op:z.literal('behavior.patch'),id,behaviorId:id,props:properties.optional(),enabled:z.boolean().optional()}),
 z.strictObject({op:z.literal('behavior.remove'),id,behaviorId:id}),
 z.strictObject({op:z.literal('mask.set'),id,mask:object.nullable()}),
 z.strictObject({op:z.literal('constraints.set'),id,constraints:z.array(object).max(32)}),
 z.strictObject({op:z.literal('transition.set'),id,side:z.enum(['in','out']),transition}),
 z.strictObject({op:z.literal('clip.trim'),id,start:frame.optional(),end:frame.optional()}),
 z.strictObject({op:z.literal('clip.split'),id,at:frame,newId:id}),
 z.strictObject({op:z.literal('asset.add'),asset:object}),
 z.strictObject({op:z.literal('asset.remove'),id}),
 z.strictObject({op:z.literal('project.patch'),changes:z.strictObject({title:z.string().min(1).max(200).optional(),width:frame.min(1).optional(),height:frame.min(1).optional(),durationFrames:frame.min(1).optional(),extensions:object.optional()})}),
]);
export const edit = z.strictObject({ projectId,expectedFingerprint:fingerprint,label:z.string().min(1).max(200),operations:z.array(operation).min(1).max(256) });
export const renderRequest=z.strictObject({kind:z.enum(['frame','storyboard','video']).default('video'),format:z.enum(['mp4','webm']).optional(),width:z.number().int().min(1).max(4096).optional(),height:z.number().int().min(1).max(4096).optional(),frame:frame.optional(),frames:z.array(frame).min(1).max(24).optional(),startFrame:frame.optional(),endFrame:frame.optional(),rate:z.strictObject({numerator:z.number().int().min(1),denominator:z.number().int().min(1)}).optional()});
export const jobId=z.string().regex(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
export const response = z.strictObject({ok:z.boolean(),data:z.unknown().optional(),error:z.strictObject({code:z.string(),message:z.string(),expected:z.string().optional(),actual:z.string().optional()}).optional()});