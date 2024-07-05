import { ItemView, Menu, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import { Book } from "src/Book";
import { createApp } from "vue";
import BookMasterPlugin from "src/main";
import NavHeader from "./NavHeader";
import { Md5 } from 'ts-md5';
import { request, requestUrl, RequestUrlParam } from "obsidian";


export const VIEW_TYPE_BOOK_TRANSLATOR = "bm-book-translator"
export class BookTranslator extends ItemView {
	plugin: BookMasterPlugin;
	navHeader: NavHeader;
	resultEl: HTMLElement;
	loadingEl: HTMLElement;
	translateToLanguage: string = "zh";

	constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
		super(leaf);
		this.plugin = plugin;

	}

	getDisplayText() {
		return "Book Translator";
	}

	getViewType() {
		return VIEW_TYPE_BOOK_TRANSLATOR;
	}

	getIcon() {
		return "languages";
	}


	async translate(text: string) {
		const apiKey = this.plugin.settings.llm.gpt.key; // 替换为您的OpenAI API密钥
		const apiUrl = this.plugin.settings.llm.gpt.host + '/v1/chat/completions';

		const headers = {
			'Accept': '*/*',
			'Accept-Encoding': 'gzip, deflate, br',
			'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`
		};

		const prompt = 'Translate the following English text to Chinese:';
		const payload = {
			model: "gpt-3.5-turbo",
			n: 1,
			presence_penalty: 0,
			stream: false,
			temperature: 0.7,
			top_p: 1,
			messages: [
				{ role: "system", content: prompt },
				{ role: "user", content: text }
			]
		}

		this.loadingEl.style.display = "flex";
		this.resultEl.textContent = "";
		return fetch(apiUrl, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(payload)
		})
			.then(response => response.json())
			.then(data => {
				this.loadingEl.style.display = "none";
				const result = data.choices[0].message.content.trim();
				this.resultEl.textContent = result;
			})
			.catch(error => {
				this.loadingEl.style.display = "none";
				new Notice("翻译接口请求错误：", error)
			})
	}

	async translateBaidu(text: string) {
		this.loadingEl.style.display = "flex";
		this.resultEl.textContent = "";
		// 去除所有回车换行
		text = text.replace(/[\r\n]/g, "");
		const APP_ID = this.plugin.settings.translate.baidu.appid;
		const SECRET_KEY = this.plugin.settings.translate.baidu.key;
		const salt = new Date().getTime().toString();
		const from = "auto";
		const to = "zh";
		const sign: string = Md5.hashStr(APP_ID + text + salt + SECRET_KEY)
		console.log(sign);
		const BAIDU_TRANSLATE_API_URL = 'http://api.fanyi.baidu.com/api/trans/vip/translate';
		const data = {
			q: text,
			appid: APP_ID,
			salt: salt,
			from: from,
			to: this.translateToLanguage,
			sign: sign
		};
		var url = BAIDU_TRANSLATE_API_URL + '?' + new URLSearchParams(data).toString();
		const requestUrlParam: RequestUrlParam = {
			url: url,
			method: "GET",
		}
		requestUrl(requestUrlParam).then((data) => {
			console.log(data);
			console.log(data.json.trans_result[0].dst);
			this.loadingEl.style.display = "none";
			this.resultEl.textContent = data.json.trans_result[0].dst;
		}).catch((error) => {
			console.log(error);
		});
	}


	protected async onOpen() {
		console.log("BookTranslator Open");
		this.contentEl.empty();
		this.contentEl.style.padding = "0";

		this.navHeader = new NavHeader(this, this.contentEl);



		this.navHeader.addAction("gear", "设置", (evt) => {
			this.openSelectTranslateToLanguageMenu(evt);
			
		});

		this.navHeader.addAction("copy", "复制", (evt) => {
			navigator.clipboard.writeText(this.resultEl.textContent);
		});

		this.navHeader.addAction("ban", "占位", (evt) => {
		});


		this.loadingEl = this.contentEl.createEl("div")
		this.loadingEl.style.height = "32px";
		this.loadingEl.style.display = "none";
		// this.loadingEl.style.display = "flex";
		this.loadingEl.style.justifyContent = "center";
		this.loadingEl.style.alignItems = "center";
		this.loadingEl.style.padding = "1rem";

		const iconEl = this.loadingEl.createDiv("div")
		iconEl.style.width = "24px";
		iconEl.style.height = "24px";
		iconEl.style.display = "inline-block";
		setIcon(iconEl, "loader");
		const iconDescEl = this.loadingEl.createDiv("div")
		iconDescEl.style.display = "inline-block";
		iconDescEl.setText("请求中")
		iconDescEl.style.paddingBottom = "5px";

		this.resultEl = this.contentEl.createEl("div");
		this.resultEl.style.padding = "1rem";
		this.resultEl.style.userSelect = "true";
	}

	private openSelectTranslateToLanguageMenu(evt: MouseEvent) {
		const menu = new Menu();
		menu.addItem((item) => {
			item
				.setTitle("中文")
				.onClick((evt) => {
					this.translateToLanguage = "zh";
				})
			item.setChecked(this.translateToLanguage === "zh");
		})
		menu.addItem((item) => {
			item
				.setTitle("英文")
				.onClick((evt) => {
					this.translateToLanguage = "en";
				})
			item.setChecked(this.translateToLanguage === "en");
		})
		menu.showAtMouseEvent(evt);
	}

}
