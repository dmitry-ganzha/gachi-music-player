export class Utils {
    public _FindFormat = async (formats: any[]) => {
        let format = await this._Opus(formats);
        return format ? format : formats?.length >= 1 ? formats[0] : null;
    };
    private _Opus = async (formats: any[]) => formats ? formats.filter(f => !f.protocol.match(/m3u8/) && f.ext.match(/mp4/))[0] : null;
}