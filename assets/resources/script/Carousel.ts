import { 
    _decorator, 
    Component, 
    Node, 
    Prefab, 
    instantiate, 
    UITransform, 
    Vec3, 
    tween, 
    Tween, 
    EventTouch, 
    input, 
    Input,
    Enum,
    clamp,
    Label,
    Color
} from 'cc';

const { ccclass, property } = _decorator;

enum Direction {
    HORIZONTAL = 0,
    VERTICAL = 1
}

Enum(Direction);

@ccclass('Carousel')
export class Carousel extends Component {
    @property({ type: [Node], tooltip: '頁面節點列表' })
    pages: Node[] = [];

    @property({ type: Prefab, tooltip: '頁面預製體' })
    pagePrefab: Prefab = null;

    @property({ type: Direction, tooltip: '滑動方向' })
    direction: Direction = Direction.HORIZONTAL;

    @property({ tooltip: '自動播放' })
    autoPlay: boolean = false;

    @property({ tooltip: '自動播放間隔(秒)', visible() { return this.autoPlay; } })
    autoPlayInterval: number = 3;

    @property({ tooltip: '滑動動畫時長(秒)' })
    animationDuration: number = 0.3;

    @property({ tooltip: '滑動閾值(0-1)' })
    slideThreshold: number = 0.3;

    @property({ tooltip: '回彈動畫時長(秒)' })
    bounceBackDuration: number = 0.2;

    @property({ tooltip: '動態創建頁面數量' })
    dynamicPageCount: number = 3;

    @property({ tooltip: '自動動態創建頁面' })
    autoDynamicCreate: boolean = true;

    private currentIndex: number = 0;
    private totalPages: number = 0;
    private pageSize: number = 0;
    private isDragging: boolean = false;
    private startTouchPos: Vec3 = new Vec3();
    private lastTouchPos: Vec3 = new Vec3();
    private contentStartPos: Vec3 = new Vec3();
    private autoPlayTimer: number = 0;
    private currentTween: Tween<Node> = null;

    // 無限滑動相關
    private clonedPages: Node[] = [];
    private actualIndex: number = 0; // 實際顯示的頁面索引

    start() {
        console.log('🚀 Carousel 開始初始化');
        
        // 檢查是否需要動態創建頁面
        if (this.autoDynamicCreate) {
            // 如果沒有設置任何頁面，或者現有頁面是空的，則動態創建
            const hasEmptyPages = this.pages.length > 0 && this.pages.every(page => page.children.length === 0);
            const hasNoPages = this.pages.length === 0 && this.node.children.length === 0;
            
            if (hasNoPages) {
                console.log('🔄 沒有任何頁面，自動動態創建');
                this.createDynamicPages();
            } else if (hasEmptyPages) {
                console.log('🔄 檢測到空頁面，為其添加動態內容');
                this.addContentToExistingPages();
            } else {
                console.log('📄 使用現有頁面設置');
                this.setupExistingPages();
            }
        } else {
            this.setupExistingPages(); // 處理現有頁面
        }
        
        this.initializeCarousel();
        this.setupTouchEvents();
        
        if (this.autoPlay) {
            this.startAutoPlay();
        }
        
        console.log('✅ Carousel 初始化完成');
    }

    private setupExistingPages() {
        console.log('🔧 設置現有頁面');
        
        // 檢查是否已經有子節點但沒有設置到 pages 數組中
        const children = this.node.children;
        console.log('檢測到子節點數量:', children.length);
        console.log('當前 pages 數組長度:', this.pages.length);
        
        // 情況1：Pages 數組已經設置，但子節點為空（說明頁面節點還沒有內容）
        if (this.pages.length > 0 && children.length === 0) {
            console.log('📋 Pages 數組已設置但場景中沒有對應節點，可能需要檢查節點引用');
            return;
        }
        
        // 情況2：有子節點但 Pages 數組為空，自動添加
        if (children.length > 0 && this.pages.length === 0) {
            console.log('檢測到現有子節點，自動添加到 pages 數組');
            this.pages = [...children];
        }
        
        // 情況3：Pages 數組和子節點都有，檢查內容並添加
        if (this.pages.length > 0) {
            console.log('📄 處理現有頁面內容');
            this.addContentToExistingPages();
        }
    }

    private createDynamicPages() {
        console.log(`🏗️ 動態創建 ${this.dynamicPageCount} 個頁面`);
        
        // 設置容器大小
        let transform = this.node.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }
        if (transform.width === 0 || transform.height === 0) {
            transform.setContentSize(750, 1334); // 默認手機屏幕大小
        }

        // 清空現有頁面
        this.pages = [];
        this.node.removeAllChildren();

        const colors = [
            new Color(255, 120, 120), // 粉紅
            new Color(120, 255, 120), // 淺綠
            new Color(120, 120, 255), // 淺藍
            new Color(255, 255, 120), // 淺黃
            new Color(255, 120, 255), // 洋紅
            new Color(120, 255, 255), // 青色
            new Color(255, 180, 120), // 橙色
            new Color(180, 120, 255), // 紫色
        ];

        for (let i = 0; i < this.dynamicPageCount; i++) {
            const page = this.createSingleDynamicPage(i, colors[i % colors.length], transform.contentSize);
            this.node.addChild(page);
            this.pages.push(page);
        }

        console.log(`✅ 動態創建完成，共 ${this.pages.length} 個頁面`);
    }

    private createSingleDynamicPage(index: number, color: Color, pageSize: any): Node {
        const page = new Node(`DynamicPage_${index + 1}`);
        
        // 設置頁面大小
        const pageTransform = page.addComponent(UITransform);
        pageTransform.setContentSize(pageSize);
        
        // 創建主標題
        const titleNode = new Node('Title');
        page.addChild(titleNode);
        titleNode.position.set(0, 200, 0);
        
        const titleTransform = titleNode.addComponent(UITransform);
        titleTransform.setContentSize(400, 80);
        
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = `動態頁面 ${index + 1}`;
        titleLabel.fontSize = 48;
        titleLabel.color = color;
        
        // 創建描述文字
        const descNode = new Node('Description');
        page.addChild(descNode);
        descNode.position.set(0, 100, 0);
        
        const descTransform = descNode.addComponent(UITransform);
        descTransform.setContentSize(500, 60);
        
        const descLabel = descNode.addComponent(Label);
        descLabel.string = `這是動態創建的第 ${index + 1} 頁\n可以左右滑動切換`;
        descLabel.fontSize = 24;
        descLabel.color = new Color(200, 200, 200);
        
        // 創建頁面指示器
        const indicatorNode = new Node('Indicator');
        page.addChild(indicatorNode);
        indicatorNode.position.set(0, 0, 0);
        
        const indicatorTransform = indicatorNode.addComponent(UITransform);
        indicatorTransform.setContentSize(200, 40);
        
        const indicatorLabel = indicatorNode.addComponent(Label);
        indicatorLabel.string = `${index + 1} / ${this.dynamicPageCount}`;
        indicatorLabel.fontSize = 32;
        indicatorLabel.color = new Color(150, 150, 150);
        
        // 創建測試按鈕
        const buttonNode = new Node('TestButton');
        page.addChild(buttonNode);
        buttonNode.position.set(0, -100, 0);
        
        const buttonTransform = buttonNode.addComponent(UITransform);
        buttonTransform.setContentSize(250, 60);
        
        const buttonLabel = buttonNode.addComponent(Label);
        buttonLabel.string = '點擊下一頁 →';
        buttonLabel.fontSize = 28;
        buttonLabel.color = new Color(255, 255, 255);
        
        // 為按鈕添加點擊事件
        buttonNode.on(Input.EventType.TOUCH_END, () => {
            console.log(`🔘 動態頁面 ${index + 1} 的按鈕被點擊`);
            this.nextPage();
        }, this);
        
        // 創建滑動提示
        const hintNode = new Node('SwipeHint');
        page.addChild(hintNode);
        hintNode.position.set(0, -200, 0);
        
        const hintTransform = hintNode.addComponent(UITransform);
        hintTransform.setContentSize(300, 40);
        
        const hintLabel = hintNode.addComponent(Label);
        hintLabel.string = '← 滑動試試 →';
        hintLabel.fontSize = 20;
        hintLabel.color = new Color(100, 100, 100);
        
        console.log(`📄 創建動態頁面: ${page.name}`);
        return page;
    }

    private addContentToExistingPages() {
        console.log('🎨 開始為現有頁面添加內容');
        
        const colors = [
            new Color(255, 100, 100), // 紅色 - p_1
            new Color(100, 255, 100), // 綠色 - p_2  
            new Color(100, 100, 255), // 藍色 - p_3
            new Color(255, 255, 100), // 黃色
            new Color(255, 100, 255), // 洋紅
        ];

        this.pages.forEach((page, index) => {
            if (!page || !page.isValid) {
                console.warn(`⚠️ 頁面 ${index} 無效，跳過`);
                return;
            }
            
            console.log(`檢查頁面 ${page.name}，子節點數量: ${page.children.length}`);
            
            // 檢查是否已經有我們的測試內容
            const hasTestContent = page.getChildByName('TestLabel') || page.getChildByName('Title');
            
            if (!hasTestContent) {
                console.log(`📝 為 ${page.name} 添加測試內容`);
                
                // 確保頁面有 UITransform
                let pageTransform = page.getComponent(UITransform);
                if (!pageTransform) {
                    pageTransform = page.addComponent(UITransform);
                    console.log(`為 ${page.name} 添加了 UITransform`);
                }
                
                // 設置頁面大小與容器一致
                const containerTransform = this.node.getComponent(UITransform);
                if (containerTransform && containerTransform.width > 0 && containerTransform.height > 0) {
                    pageTransform.setContentSize(containerTransform.contentSize);
                    console.log(`設置 ${page.name} 大小為:`, containerTransform.contentSize);
                } else {
                    pageTransform.setContentSize(750, 1334); // 默認大小
                    console.log(`設置 ${page.name} 默認大小: 750x1334`);
                }

                // 添加一個明顯的背景標籤
                const testLabelNode = new Node('TestLabel');
                page.addChild(testLabelNode);
                
                const testLabelTransform = testLabelNode.addComponent(UITransform);
                testLabelTransform.setContentSize(400, 120);
                testLabelNode.position.set(0, 0, 0); // 置中顯示
                
                const testLabel = testLabelNode.addComponent(Label);
                testLabel.string = `${page.name}\n✨ 動態內容 ✨\n頁面 ${index + 1}/${this.pages.length}`;
                testLabel.fontSize = 36;
                testLabel.color = colors[index % colors.length];
                
                console.log(`✅ 為 ${page.name} 添加了測試標籤`);
                
                // 添加一個大一點的測試按鈕
                const testButtonNode = new Node('TestButton');
                page.addChild(testButtonNode);
                
                testButtonNode.position.set(0, -150, 0);
                const testButtonTransform = testButtonNode.addComponent(UITransform);
                testButtonTransform.setContentSize(300, 80);
                
                const testButtonLabel = testButtonNode.addComponent(Label);
                testButtonLabel.string = `點我切換到下一頁 →`;
                testButtonLabel.fontSize = 28;
                testButtonLabel.color = new Color(255, 255, 255);
                
                // 為測試按鈕添加點擊事件
                testButtonNode.on(Input.EventType.TOUCH_END, () => {
                    console.log(`🔘 ${page.name} 的測試按鈕被點擊`);
                    this.nextPage();
                }, this);
                
                console.log(`✅ 為 ${page.name} 添加了測試按鈕`);
                
                // 添加滑動提示
                const hintNode = new Node('SwipeHint');
                page.addChild(hintNode);
                
                hintNode.position.set(0, -250, 0);
                const hintTransform = hintNode.addComponent(UITransform);
                hintTransform.setContentSize(300, 40);
                
                const hintLabel = hintNode.addComponent(Label);
                hintLabel.string = '← 左右滑動試試 →';
                hintLabel.fontSize = 20;
                hintLabel.color = new Color(150, 150, 150);
                
                console.log(`✅ 為 ${page.name} 添加了滑動提示`);
            } else {
                console.log(`✅ ${page.name} 已有內容，跳過添加`);
            }
        });
        
        console.log('🎨 完成為所有頁面添加內容');
    }

    private initializeCarousel() {
        // 檢查頁面設置
        if (this.pages.length === 0) {
            if (this.pagePrefab) {
                console.warn('沒有設置頁面節點，但有設置 pagePrefab。請手動創建頁面或在 pages 數組中添加頁面節點');
            } else {
                // 只有在沒有任何子節點的情況下才創建默認頁面
                if (this.node.children.length === 0) {
                    console.warn('沒有設置頁面，自動創建默認測試頁面');
                    this.createDefaultPages();
                } else {
                    console.warn('檢測到子節點但未設置到 pages 數組，請檢查 setupExistingPages 方法');
                }
            }
        }

        // 如果仍然沒有頁面，直接返回
        if (this.pages.length === 0) {
            return;
        }

        // 檢查頁面節點是否有效
        const validPages = this.pages.filter(page => page != null);
        if (validPages.length !== this.pages.length) {
            console.warn('pages 數組中存在空的節點，已過濾掉空節點');
            this.pages = validPages;
        }

        this.totalPages = this.pages.length;
        
        if (this.totalPages === 0) {
            console.error('所有頁面節點都為空，無法初始化 Carousel');
            return;
        }

        if (this.totalPages < 2) {
            console.warn('頁面數量少於2個，無限滑動效果可能不明顯');
            // 即使少於2個頁面也繼續初始化，但不設置無限滾動
            this.updatePageSize();
            this.goToPage(0, false);
            return;
        }

        this.setupInfiniteScroll();
        this.updatePageSize();
        this.goToPage(0, false);
    }

    private createDefaultPages() {
        // 設置容器大小
        const transform = this.node.getComponent(UITransform);
        if (!transform) {
            this.node.addComponent(UITransform);
        }
        if (transform.width === 0 || transform.height === 0) {
            transform.setContentSize(750, 1334); // 默認手機屏幕大小
        }

        // 創建 3 個默認頁面
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1']; // 紅、青、藍
        const pageNames = ['頁面 1', '頁面 2', '頁面 3'];

        for (let i = 0; i < 3; i++) {
            const page = new Node(`DefaultPage_${i + 1}`);
            
            // 設置頁面大小與容器一致
            const pageTransform = page.addComponent(UITransform);
            pageTransform.setContentSize(transform.contentSize);
            
            // 創建背景
            const bgNode = new Node('Background');
            page.addChild(bgNode);
            
            const bgTransform = bgNode.addComponent(UITransform);
            bgTransform.setContentSize(transform.contentSize);
            
            // 添加標籤
            const labelNode = new Node('Label');
            page.addChild(labelNode);
            
            const labelTransform = labelNode.addComponent(UITransform);
            labelTransform.setContentSize(300, 100);
            
            const label = labelNode.addComponent(Label);
            label.string = pageNames[i];
            label.fontSize = 48;
            label.color = new Color(255, 255, 255);
            
            // 添加到場景和數組
            this.node.addChild(page);
            this.pages.push(page);
        }

        console.log('✅ 自動創建了 3 個默認測試頁面');
    }

    private setupInfiniteScroll() {
        // 清除之前的克隆頁面
        this.clonedPages.forEach(page => {
            if (page && page.isValid) {
                page.destroy();
            }
        });
        this.clonedPages = [];

        // 檢查是否有足夠的頁面進行無限滾動
        if (this.totalPages < 2) {
            console.warn('頁面數量不足，跳過無限滾動設置');
            this.actualIndex = 0;
            return;
        }

        // 檢查頁面節點是否有效
        const lastPage = this.pages[this.totalPages - 1];
        const firstPage = this.pages[0];

        if (!lastPage || !firstPage) {
            console.error('頁面節點無效，無法設置無限滾動');
            this.actualIndex = 0;
            return;
        }

        try {
            // 在開頭添加最後一頁的克隆
            const lastPageClone = instantiate(lastPage);
            this.node.insertChild(lastPageClone, 0);
            this.clonedPages.push(lastPageClone);

            // 在結尾添加第一頁的克隆
            const firstPageClone = instantiate(firstPage);
            this.node.addChild(firstPageClone);
            this.clonedPages.push(firstPageClone);

            // 更新實際索引（因為在開頭添加了一頁）
            this.actualIndex = 1;
        } catch (error) {
            console.error('設置無限滾動時發生錯誤:', error);
            // 如果克隆失敗，回退到簡單模式
            this.actualIndex = 0;
        }
    }

    private updatePageSize() {
        const transform = this.node.getComponent(UITransform);
        if (this.direction === Direction.HORIZONTAL) {
            this.pageSize = transform.width;
        } else {
            this.pageSize = transform.height;
        }

        console.log('頁面大小設置為:', this.pageSize);
        console.log('容器大小:', transform.contentSize);
        console.log('滑動方向:', this.direction === Direction.HORIZONTAL ? '水平' : '垂直');

        // 更新所有頁面的位置
        this.updateAllPagesPosition();
    }

    private updateAllPagesPosition() {
        const children = this.node.children;
        console.log('更新頁面位置，子節點數量:', children.length, '實際索引:', this.actualIndex);
        
        for (let i = 0; i < children.length; i++) {
            const page = children[i];
            if (this.direction === Direction.HORIZONTAL) {
                const newX = (i - this.actualIndex) * this.pageSize;
                page.position = new Vec3(newX, 0, 0);
                console.log(`頁面 ${i} (${page.name}) 位置設為: x=${newX}`);
            } else {
                const newY = -(i - this.actualIndex) * this.pageSize;
                page.position = new Vec3(0, newY, 0);
                console.log(`頁面 ${i} (${page.name}) 位置設為: y=${newY}`);
            }
        }
    }

    private setupTouchEvents() {
        console.log('🔧 開始設置觸摸事件');
        
        // 方法1: 使用節點事件
        this.node.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        
        // 方法2: 使用全局 input 系統（備用）
        input.on(Input.EventType.TOUCH_START, this.onGlobalTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onGlobalTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
        
        console.log('✅ 觸摸事件已設置');
        console.log('Carousel 節點大小:', this.node.getComponent(UITransform)?.contentSize);
        console.log('Carousel 節點位置:', this.node.position);
    }

    // 全局觸摸事件處理（備用方案）
    private onGlobalTouchStart(event: EventTouch) {
        console.log('🌍 全局觸摸開始:', event.getUILocation());
        this.onTouchStart(event);
    }

    private onGlobalTouchMove(event: EventTouch) {
        if (this.isDragging) {
            this.onTouchMove(event);
        }
    }

    private onGlobalTouchEnd(event: EventTouch) {
        if (this.isDragging) {
            this.onTouchEnd(event);
        }
    }

    private onTouchStart(event: EventTouch) {
        console.log('🖱️ 觸摸開始:', event.getUILocation());
        this.isDragging = true;
        this.startTouchPos.set(event.getUILocation().x, event.getUILocation().y, 0);
        this.lastTouchPos.set(this.startTouchPos);
        this.contentStartPos.set(this.node.position);
        
        // 停止當前動畫
        if (this.currentTween) {
            this.currentTween.stop();
        }

        // 停止自動播放
        if (this.autoPlay) {
            this.stopAutoPlay();
        }
    }

    private onTouchMove(event: EventTouch) {
        if (!this.isDragging) return;

        const currentPos = new Vec3(event.getUILocation().x, event.getUILocation().y, 0);
        const deltaPos = new Vec3();
        Vec3.subtract(deltaPos, currentPos, this.lastTouchPos);

        console.log('🖱️ 觸摸移動:', deltaPos.x, deltaPos.y);

        // 移動內容
        const newPos = new Vec3(this.node.position);
        if (this.direction === Direction.HORIZONTAL) {
            newPos.x += deltaPos.x;
        } else {
            newPos.y += deltaPos.y;
        }
        this.node.position = newPos;

        this.lastTouchPos.set(currentPos);
    }

    private onTouchEnd(event: EventTouch) {
        if (!this.isDragging) return;
        
        console.log('🖱️ 觸摸結束');
        this.isDragging = false;

        const endPos = new Vec3(event.getUILocation().x, event.getUILocation().y, 0);
        const totalDelta = new Vec3();
        Vec3.subtract(totalDelta, endPos, this.startTouchPos);

        const deltaDistance = this.direction === Direction.HORIZONTAL ? totalDelta.x : totalDelta.y;
        const threshold = this.pageSize * this.slideThreshold;

        console.log('滑動距離:', deltaDistance, '閾值:', threshold);

        if (Math.abs(deltaDistance) > threshold) {
            // 滑動距離足夠，切換頁面
            if (deltaDistance > 0) {
                this.previousPage();
            } else {
                this.nextPage();
            }
        } else {
            // 滑動距離不足，回彈到當前頁面
            this.snapToCurrentPage();
        }

        // 重新開始自動播放
        if (this.autoPlay) {
            this.startAutoPlay();
        }
    }

    public nextPage() {
        if (this.totalPages === 0) {
            console.warn('沒有頁面可以切換');
            return;
        }

        if (this.clonedPages.length > 0) {
            // 無限滾動模式
            this.actualIndex++;
        } else {
            // 簡單模式，有邊界限制
            if (this.currentIndex < this.totalPages - 1) {
                this.actualIndex++;
                this.currentIndex++;
            } else {
                // 到達最後一頁，跳轉到第一頁
                this.actualIndex = 0;
                this.currentIndex = 0;
            }
        }
        this.goToActualIndex(true);
    }

    public previousPage() {
        if (this.totalPages === 0) {
            console.warn('沒有頁面可以切換');
            return;
        }

        if (this.clonedPages.length > 0) {
            // 無限滾動模式
            this.actualIndex--;
        } else {
            // 簡單模式，有邊界限制
            if (this.currentIndex > 0) {
                this.actualIndex--;
                this.currentIndex--;
            } else {
                // 到達第一頁，跳轉到最後一頁
                this.actualIndex = this.totalPages - 1;
                this.currentIndex = this.totalPages - 1;
            }
        }
        this.goToActualIndex(true);
    }

    public goToPage(index: number, animated: boolean = true) {
        if (this.totalPages === 0) {
            console.warn('沒有頁面可以跳轉');
            return;
        }

        this.currentIndex = clamp(index, 0, this.totalPages - 1);
        
        if (this.clonedPages.length > 0) {
            // 無限滾動模式，actualIndex 需要加1（因為開頭有克隆頁面）
            this.actualIndex = this.currentIndex + 1;
        } else {
            // 簡單模式
            this.actualIndex = this.currentIndex;
        }
        
        this.goToActualIndex(animated);
    }

    private goToActualIndex(animated: boolean = true) {
        const targetPos = new Vec3();
        if (this.direction === Direction.HORIZONTAL) {
            targetPos.x = -this.actualIndex * this.pageSize;
        } else {
            targetPos.y = this.actualIndex * this.pageSize;
        }

        if (animated) {
            this.currentTween = tween(this.node)
                .to(this.animationDuration, { position: targetPos })
                .call(() => {
                    this.checkInfiniteScrollBounds();
                })
                .start();
        } else {
            this.node.position = targetPos;
            this.checkInfiniteScrollBounds();
        }
    }

    private checkInfiniteScrollBounds() {
        const children = this.node.children;
        
        // 只有在設置了無限滾動的情況下才進行邊界檢查
        if (this.clonedPages.length === 0) {
            // 簡單模式，直接更新索引
            this.currentIndex = Math.max(0, Math.min(this.actualIndex, this.totalPages - 1));
            return;
        }
        
        if (this.actualIndex >= children.length - 1) {
            // 到達最後一個克隆頁面，跳轉到真實的第一頁
            this.actualIndex = 1;
            this.currentIndex = 0;
            this.jumpToActualIndex();
        } else if (this.actualIndex <= 0) {
            // 到達第一個克隆頁面，跳轉到真實的最後一頁
            this.actualIndex = this.totalPages;
            this.currentIndex = this.totalPages - 1;
            this.jumpToActualIndex();
        } else {
            // 更新當前頁面索引
            this.currentIndex = this.actualIndex - 1;
        }
    }

    private jumpToActualIndex() {
        const targetPos = new Vec3();
        if (this.direction === Direction.HORIZONTAL) {
            targetPos.x = -this.actualIndex * this.pageSize;
        } else {
            targetPos.y = this.actualIndex * this.pageSize;
        }
        this.node.position = targetPos;
    }

    private snapToCurrentPage() {
        this.currentTween = tween(this.node)
            .to(this.bounceBackDuration, { 
                position: this.direction === Direction.HORIZONTAL 
                    ? new Vec3(-this.actualIndex * this.pageSize, 0, 0)
                    : new Vec3(0, this.actualIndex * this.pageSize, 0)
            })
            .start();
    }

    private startAutoPlay() {
        this.autoPlayTimer = 0;
    }

    private stopAutoPlay() {
        this.autoPlayTimer = 0;
    }

    update(deltaTime: number) {
        if (this.autoPlay && !this.isDragging && this.totalPages > 1) {
            this.autoPlayTimer += deltaTime;
            if (this.autoPlayTimer >= this.autoPlayInterval) {
                this.nextPage();
                this.autoPlayTimer = 0;
            }
        }
    }

    // 公共 API
    public getCurrentPageIndex(): number {
        return this.currentIndex;
    }

    public getTotalPages(): number {
        return this.totalPages;
    }

    public setAutoPlay(enabled: boolean) {
        this.autoPlay = enabled;
        if (enabled) {
            this.startAutoPlay();
        } else {
            this.stopAutoPlay();
        }
    }

    // 動態頁面管理 API
    public addPage(pageContent?: string): void {
        console.log('➕ 動態添加新頁面');
        
        const transform = this.node.getComponent(UITransform);
        const colors = [
            new Color(255, 120, 120), new Color(120, 255, 120), new Color(120, 120, 255),
            new Color(255, 255, 120), new Color(255, 120, 255), new Color(120, 255, 255),
        ];
        
        const pageIndex = this.pages.length;
        const color = colors[pageIndex % colors.length];
        const content = pageContent || `新頁面 ${pageIndex + 1}`;
        
        const newPage = this.createSingleDynamicPage(pageIndex, color, transform.contentSize);
        
        // 更新標題為自定義內容
        const titleLabel = newPage.getChildByName('Title')?.getComponent(Label);
        if (titleLabel) {
            titleLabel.string = content;
        }
        
        this.node.addChild(newPage);
        this.pages.push(newPage);
        this.totalPages = this.pages.length;
        
        // 重新初始化
        this.setupInfiniteScroll();
        this.updatePageSize();
        
        console.log(`✅ 已添加頁面: ${content}，總計 ${this.totalPages} 頁`);
    }

    public removePage(index: number): void {
        if (index < 0 || index >= this.pages.length) {
            console.warn('頁面索引超出範圍');
            return;
        }
        
        console.log(`➖ 移除頁面 ${index + 1}`);
        
        const pageToRemove = this.pages[index];
        pageToRemove.destroy();
        this.pages.splice(index, 1);
        this.totalPages = this.pages.length;
        
        // 調整當前頁面索引
        if (this.currentIndex >= this.totalPages) {
            this.currentIndex = Math.max(0, this.totalPages - 1);
        }
        
        // 重新初始化
        this.setupInfiniteScroll();
        this.updatePageSize();
        this.goToPage(this.currentIndex, false);
        
        console.log(`✅ 已移除頁面，剩餘 ${this.totalPages} 頁`);
    }

    public clearAllPages(): void {
        console.log('🗑️ 清空所有頁面');
        
        this.pages.forEach(page => page.destroy());
        this.clonedPages.forEach(page => page.isValid && page.destroy());
        
        this.pages = [];
        this.clonedPages = [];
        this.totalPages = 0;
        this.currentIndex = 0;
        this.actualIndex = 0;
        
        console.log('✅ 所有頁面已清空');
    }

    public recreateDynamicPages(count?: number): void {
        console.log('🔄 重新創建動態頁面');
        
        this.clearAllPages();
        this.dynamicPageCount = count || this.dynamicPageCount;
        this.createDynamicPages();
        this.initializeCarousel();
        
        console.log(`✅ 重新創建完成，共 ${this.totalPages} 頁`);
    }

    protected onDestroy() {
        // 清理節點事件監聽
        this.node.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        // 清理全局事件監聽
        input.off(Input.EventType.TOUCH_START, this.onGlobalTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onGlobalTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);

        // 停止動畫
        if (this.currentTween) {
            this.currentTween.stop();
        }
        
        console.log('🧹 Carousel 事件清理完成');
    }
}

