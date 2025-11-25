import { _decorator, Component, Node, UIOpacity, Vec3, tween } from "cc";
const { ccclass, property } = _decorator;

@ccclass("popup_window")
export class popup_window extends Component {
	hidwindow() {
		// 先執行 tween 動畫，完成後再隱藏節點
		const uiOpacity = this.node.getComponent(UIOpacity);
		if (uiOpacity) {
			tween(uiOpacity).to(0.3, { opacity: 0 }, { easing: 'cubicInOut' }).start();
		}
		tween(this.node)
			.to(0.3, { scale: new Vec3(0, 0, 0) }, { easing: 'cubicInOut' })
			.call(() => {
				this.node.active = false;
			})
			.start();
	}

	showwindow() {
		// 先顯示節點，再執行 tween 動畫
		this.node.active = true;
		this.node.setScale(0, 0, 0); // 設置初始縮放為 0
		
		const uiOpacity = this.node.getComponent(UIOpacity);
		if (uiOpacity) {
			uiOpacity.opacity = 0; // 設置初始透明度為 0
			tween(uiOpacity).to(0.3, { opacity: 255 }, { easing: 'cubicInOut' }).start();
		}
		tween(this.node)
			.to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'cubicInOut' })
			.start();
	}
	yesbutton() {
		this.hidwindow();
	}
	nobutton() {
		this.hidwindow();
	}

	start() { }

	update(deltaTime: number) { }
}
