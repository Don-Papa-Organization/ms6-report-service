import axios, { AxiosInstance, AxiosResponse} from "axios"

export class HttpClient {
    public instance: AxiosInstance;

    constructor(baseURL: string){
        this.instance = axios.create({
            baseURL,
            timeout: 10000,
            headers: {
                "Content-Type": "application/json"
            }
        })

        this.setupInterceptor()

    }

    private setupInterceptor(): void{
        this.instance.interceptors.request.use(
            (config) => {
                console.log(`${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
                return config
            },
            (error) => Promise.reject(error)
        )

        this.instance.interceptors.response.use(
            (response) => {
                return response
            },
            (error) => {
                console.log('Http Error: ', error.response?.status, error.message)
                throw error
            }
        )
    }
}