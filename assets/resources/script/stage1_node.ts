import { 
    _decorator, 
    Component, 
    Node, 
    instantiate, 
    Prefab, 
    resources, 
    UITransform,
    Label,
    Button,
    Vec3,
    director,
    find
} from 'cc';
const { ccclass, property } = _decorator;

@ccclass('stage1_node')
export class stage1_node extends Component {
    
    @property({ type: Node, tooltip: '容器節點' })
    container: Node = null;

    private loadedComponents: Node[] = [];

    start() {
        // this.setupContainer();
        this.createLoadButton();
        this.createCheckButton();
        this.checkPersistRoot();
    }

    private createCheckButton() {
        // 創建檢查 PersistRoot 按鈕
        const checkButtonNode = new Node('CheckButton');
        this.node.addChild(checkButtonNode);
        
        const buttonTransform = checkButtonNode.addComponent(UITransform);
        buttonTransform.setContentSize(200, 60);
        checkButtonNode.position = new Vec3(0, 120, 0);
        
        const buttonLabel = checkButtonNode.addComponent(Label);
        buttonLabel.string = '檢查 PersistRoot';
        buttonLabel.fontSize = 24;
        
        const button = checkButtonNode.addComponent(Button);
        checkButtonNode.on(Button.EventType.CLICK, () => {
            this.checkPersistRoot();
        }, this);
    }

    private checkPersistRoot() {
        console.log('🔍 開始檢查 PersistRoot 節點...');
        
        // 方法1: 使用 find 查找 PersistRoot (全局搜索)
        const persistRoot1 = find('PersistRoot');
        
        // 方法2: 從場景根節點搜尋
        const scene = director.getScene();
        const persistRoot2 = scene?.getChildByName('PersistRoot');
        
        // 方法3: 遍歷所有子節點查找
        let persistRoot3 = null;
        if (scene) {
            for (let i = 0; i < scene.children.length; i++) {
                const child = scene.children[i];
                if (child.name === 'PersistRoot') {
                    persistRoot3 = child;
                    break;
                }
            }
        }
        
        // 方法4: 檢查節點是否為持久節點
        let persistRoot4 = null;
        if (persistRoot1 && director.isPersistRootNode && director.isPersistRootNode(persistRoot1)) {
            persistRoot4 = persistRoot1;
        }
        
        // 方法5: 遞歸搜索整個場景樹
        function findNodeRecursively(parent: Node, targetName: string): Node | null {
            if (parent.name === targetName) {
                return parent;
            }
            for (let child of parent.children) {
                const found = findNodeRecursively(child, targetName);
                if (found) return found;
            }
            return null;
        }
        
        let persistRoot5 = null;
        if (scene) {
            persistRoot5 = findNodeRecursively(scene, 'PersistRoot');
        }
        
        console.log('📋 PersistRoot 檢查結果:');
        console.log('  方法1 (find全局): ', persistRoot1 ? '✅ 找到' : '❌ 未找到');
        console.log('  方法2 (scene子節點): ', persistRoot2 ? '✅ 找到' : '❌ 未找到');
        console.log('  方法3 (遍歷): ', persistRoot3 ? '✅ 找到' : '❌ 未找到');
        console.log('  方法4 (持久節點檢查): ', persistRoot4 ? '✅ 是持久節點' : '❌ 不是持久節點');
        console.log('  方法5 (遞歸搜索): ', persistRoot5 ? '✅ 找到' : '❌ 未找到');
        
        // 檢查當前場景中所有節點的持久狀態
        if (scene) {
            console.log('📋 場景根節點的持久狀態:');
            scene.children.forEach((child, index) => {
                const isPersist = director.isPersistRootNode ? director.isPersistRootNode(child) : false;
                console.log(`  ${index + 1}. ${child.name} (持久節點: ${isPersist ? '✅' : '❌'})`);
            });
        }
        
        // 找到任何一個 PersistRoot 就顯示詳細信息
        const foundPersistRoot = persistRoot1 || persistRoot2 || persistRoot3 || persistRoot4 || persistRoot5;
        
        if (foundPersistRoot) {
            console.log('📍 PersistRoot 詳細信息:');
            console.log('  名稱:', foundPersistRoot.name);
            console.log('  是否有效:', foundPersistRoot.isValid);
            console.log('  是否活躍:', foundPersistRoot.active);
            console.log('  子節點數量:', foundPersistRoot.children.length);
            console.log('  位置:', foundPersistRoot.position);
            console.log('  父節點:', foundPersistRoot.parent ? foundPersistRoot.parent.name : '無');
            
            // 列出所有子節點
            if (foundPersistRoot.children.length > 0) {
                console.log('  子節點列表:');
                foundPersistRoot.children.forEach((child, index) => {
                    console.log(`    ${index + 1}. ${child.name} (活躍: ${child.active})`);
                });
            }
        } else {
            console.log('❌ PersistRoot 節點完全找不到');
            
            // 列出場景中的所有根節點
            if (scene) {
                console.log('📋 當前場景中的所有根節點:');
                scene.children.forEach((child, index) => {
                    console.log(`  ${index + 1}. ${child.name}`);
                });
            }
        }
        
        return foundPersistRoot;
    }


    private createLoadButton() {
        // 創建載入按鈕
        const buttonNode = new Node('LoadButton');
        this.node.addChild(buttonNode);
        
        const buttonTransform = buttonNode.addComponent(UITransform);
        buttonTransform.setContentSize(200, 60);
        buttonNode.position = new Vec3(0, 200, 0);
        
        const buttonLabel = buttonNode.addComponent(Label);
        buttonLabel.string = '動態載入元件';
        buttonLabel.fontSize = 24;
        
        const button = buttonNode.addComponent(Button);
        buttonNode.on(Button.EventType.CLICK, this.loadComponent, this);
    }

    private loadComponent() {
        // 方法1：直接創建簡單元件
        this.createSimpleComponent();
        
        // 方法2：從 resources 載入預製體（如果有的話）
        // this.loadPrefabComponent();
    }

    private createSimpleComponent() {
        const componentNode = new Node(`Component_${this.loadedComponents.length + 1}`);
        
        // 設置大小和位置
        const transform = componentNode.addComponent(UITransform);
        transform.setContentSize(120, 120);
        
        // 隨機位置
        const x = (Math.random() - 0.5) * 300;
        const y = (Math.random() - 0.5) * 200;
        componentNode.position = new Vec3(x, y, 0);
        
        // 添加標籤
        const label = componentNode.addComponent(Label);
        label.string = `元件 ${this.loadedComponents.length + 1}`;
        label.fontSize = 20;
        
        // 添加點擊事件
        componentNode.on(Node.EventType.TOUCH_END, () => {
            this.removeComponent(componentNode);
        }, this);
        
        // 添加到容器
        this.container.addChild(componentNode);
        this.loadedComponents.push(componentNode);
        
        console.log(`已載入元件: ${componentNode.name}`);
    }

    private loadPrefabComponent() {
        // 從 resources 載入預製體範例
        resources.load('prefab/SampleComponent', Prefab, (err, prefab) => {
            if (err) {
                console.warn('無法載入預製體，改為創建簡單元件');
                this.createSimpleComponent();
                return;
            }
            
            const componentNode = instantiate(prefab);
            componentNode.name = `PrefabComponent_${this.loadedComponents.length + 1}`;
            
            // 隨機位置
            const x = (Math.random() - 0.5) * 300;
            const y = (Math.random() - 0.5) * 200;
            componentNode.position = new Vec3(x, y, 0);
            
            this.container.addChild(componentNode);
            this.loadedComponents.push(componentNode);
            
            console.log(`已載入預製體元件: ${componentNode.name}`);
        });
    }

    private removeComponent(componentNode: Node) {
        const index = this.loadedComponents.indexOf(componentNode);
        if (index > -1) {
            this.loadedComponents.splice(index, 1);
            componentNode.removeFromParent();
            console.log(`已移除元件: ${componentNode.name}`);
        }
    }

    // 清理所有載入的元件
    public clearAllComponents() {
        this.loadedComponents.forEach(component => {
            component.removeFromParent();
        });
        this.loadedComponents = [];
        console.log('已清理所有動態載入的元件');
    }
}

