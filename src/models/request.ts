import { UrlWithParsedQuery } from "url";

export class Request {
	url!: UrlWithParsedQuery;
	api: string = '';
	args: any;
	action: string = '';
	status!: number;
    method: string = '';
    body: string | object | undefined;
	source = {
        address: '',
        port: ''
    };
	destination = {
        hostname: '',
        path: '',
    };
	headers = {
        contentType: '',
        returnContentType: ''
    };
}